
'use server';

import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { User, VerificationTemplate, SubscriptionPlan } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from 'firebase-admin';
import Stripe from 'stripe';
import { areDetailsEqual } from '@/lib/utils';

type ProfileUpdateData = Omit<User, 'id' | 'uid' | 'email' | 'role' | 'avatar' | 'memberSince' | 'username'>;

export async function updateUserProfile(userId: string, data: ProfileUpdateData): Promise<{ success: true; user: User } | { success: false; error: string }> {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'User profile not found.' };
    }

    const user = userSnap.data() as User;
    const countryCode = data.address?.country;

    // --- Property Mapping ---
    // Explicitly construct the update object with only allowed fields.
    const updateData: { [key: string]: any } = {
        updatedAt: new Date().toISOString(),
        scopedVerificationIds: {} 
    };

    const directProperties: (keyof ProfileUpdateData)[] = [
      'name', 'companyName', 'phoneNumber', 'companyDescription',
      'taxId', 'businessType', 'exportScope', 
      'jobTitle', 'companyWebsite', 'billingSameAsShipping'
    ];

    directProperties.forEach(prop => {
      // Check if property exists in incoming data to avoid overwriting with undefined
      if (data[prop] !== undefined) {
        updateData[prop] = data[prop];
      }
    });
    
    if (data.address) updateData.address = data.address;
    if (data.shippingAddress) updateData.shippingAddress = data.shippingAddress;
    if (data.billingAddress) updateData.billingAddress = data.billingAddress;
    
    // This is the key change: Only save verificationDetails if they exist.
    // The main logic for handling them is in the scoped ID check below.
    if (data.verificationDetails) {
        updateData.verificationDetails = data.verificationDetails;
    }


    if (countryCode && data.verificationDetails) {
        const templatesSnap = await adminDb.collection('verificationTemplates').doc(countryCode).get();
        if (templatesSnap.exists) {
            const template = templatesSnap.data() as VerificationTemplate;
            for (const field of template.fields) {
                const value = data.verificationDetails[field.name];
                if (value) {
                    const scopedKey = `${field.name}-${countryCode}`;
                    const query = adminDb.collection('users')
                        .where(`scopedVerificationIds.${scopedKey}`, '==', value)
                        .limit(2);
                    
                    const snapshot = await query.get();
                    const isDuplicate = snapshot.docs.some(doc => doc.id !== userId);

                    if (isDuplicate) {
                        return { 
                            success: false, 
                            error: `This ${field.label} is already registered to another user in this country.` 
                        };
                    }
                    updateData.scopedVerificationIds[scopedKey] = value;
                }
            }
        }
    }
    
    // --- Start: Re-verification Logic ---
    const previousCountry = user.address?.country;
    const newCountry = data.address?.country;
    const verificationDetailsChanged = !areDetailsEqual(user.verificationDetails, data.verificationDetails);
    const companyNameChanged = user.companyName !== data.companyName;

    if (user.verificationStatus === 'verified' && ( (newCountry && newCountry !== previousCountry) || verificationDetailsChanged || companyNameChanged) ) {
      updateData.verificationStatus = 'pending';
    } else if (newCountry && newCountry !== previousCountry) { 
      updateData.verificationStatus = 'unverified';
      updateData.verificationDocuments = {};
    }
    // --- End: Re-verification Logic ---
    
    await userRef.update(updateData);
    const updatedUserSnap = await userRef.get();
    const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() } as User;


    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true, user: updatedUser };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    const errorMessage = error.message || 'Failed to update profile on the server. Please check the server logs.';
    return { success: false, error: errorMessage };
  }
}

export async function submitVerificationDocuments(formData: FormData, token: string): Promise<{ success: true; updatedUser: User } | { success: false; error: string }> {
  try {
    if (!token) {
      throw new Error('Not authenticated');
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new Error('User not found.');
    }
    const user = userSnap.data() as User;

    const bucket = adminStorage.bucket();
    const uploadedDocs: { [key: string]: { url: string, fileName: string } } = {};
    const addressProofType = formData.get('addressProofType');
    
    const docUpdates: { [key: string]: any } = {};
    if (user.verificationDocuments) {
        docUpdates['verificationDocuments'] = { ...user.verificationDocuments };
    }
    
    if (addressProofType === 'card') {
      if (docUpdates.verificationDocuments?.addressProof) {
        delete docUpdates.verificationDocuments.addressProof;
      }
    } else { // statement
      if (docUpdates.verificationDocuments?.addressProof_front) {
        delete docUpdates.verificationDocuments.addressProof_front;
      }
       if (docUpdates.verificationDocuments?.addressProof_back) {
        delete docUpdates.verificationDocuments.addressProof_back;
      }
    }


    for (const [fieldName, file] of formData.entries()) {
      if (file instanceof File) {
        const filePath = `verification-documents/${userId}/${uuidv4()}-${file.name}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        
        await bucket.file(filePath).save(buffer, {
            metadata: { contentType: file.type }
        });

        const [signedUrl] = await bucket.file(filePath).getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        
        uploadedDocs[fieldName] = { url: signedUrl, fileName: file.name };
      }
    }

    let shouldUpdateStatus = false;
    // Update status to pending if new files are uploaded, or if the user was not already pending/verified.
    if (Object.keys(uploadedDocs).length > 0 || (user.verificationStatus !== 'pending' && user.verificationStatus !== 'verified')) {
      shouldUpdateStatus = true;
    }

    if (shouldUpdateStatus) {
      docUpdates['verificationStatus'] = 'pending';
    }

    if (Object.keys(uploadedDocs).length > 0) {
        if (!docUpdates.verificationDocuments) {
            docUpdates.verificationDocuments = {};
        }
        docUpdates.verificationDocuments = { ...docUpdates.verificationDocuments, ...uploadedDocs };
    }
      
    if (Object.keys(docUpdates).length > 0) {
        await userRef.update(docUpdates);
    }
    
    revalidatePath('/profile/verification');
    revalidatePath('/profile');

    const updatedUserSnap = await userRef.get();
    const updatedUser = { id: updatedUserSnap.id, uid: userId, ...updatedUserSnap.data() } as User;
    return { success: true, updatedUser };

  } catch(error: any) {
    console.error("Error submitting verification docs:", error);
    return { success: false, error: error.message || "Failed to submit documents." };
  }
}


export async function confirmStripePayment(
  paymentIntentId: string
): Promise<{ success: true } | { success: false, error: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { success: false, error: 'Stripe is not configured on the server.' };
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return { success: false, error: 'Payment was not successful.' };
    }
    
    const userId = paymentIntent.metadata?.firebaseUID;
    const planId = paymentIntent.metadata?.planId;

    if (!userId || !planId) {
      throw new Error('Payment metadata is missing user or plan ID.');
    }

    const userRef = adminDb.collection('users').doc(userId);
    await userRef.update({ subscriptionPlanId: planId });
    
    console.log(`Direct Confirm: Successfully updated subscription for user ${userId} to plan ${planId}.`);

    revalidatePath('/profile/subscription');
    revalidatePath('/(app)/layout'); // Revalidate layout to update user nav

    return { success: true };

  } catch (error: any) {
    console.error('Error confirming Stripe payment:', error);
    return { success: false, error: error.message || 'Failed to confirm payment on server.' };
  }
}
