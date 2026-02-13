

'use server';

import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { User, VerificationTemplate, SubscriptionPlan, Offer } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from 'firebase-admin';
import Stripe from 'stripe';
import { areDetailsEqual } from '@/lib/utils';
import { add, isFuture } from 'date-fns';
import { createSubscriptionInvoice } from '@/services/invoicing';
import { getPlanAndUser, getUser } from '@/lib/database';
import { sendOfferAcceptedEmail } from '@/services/email';

type ProfileUpdateData = Omit<User, 'id' | 'uid' | 'email' | 'role' | 'avatar' | 'memberSince' | 'username' | 'subscriptionPlan'>;


export async function updateUserProfile(userId: string, data: ProfileUpdateData): Promise<{ success: true; user: User } | { success: false; error: string }> {
  // AGGRESSIVE VALIDATION
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    const errorMsg = `Critical Error: User ID is missing or invalid. Cannot update profile. Received: '${userId}'`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      const errorMsg = `User profile not found in the database for ID: ${userId}.`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const originalUser = userSnap.data() as User;


	
	const dataToUpdate: { [key: string]: any } = {
  // fields common to both buyer and seller
  name: data.name,
  phoneNumber: data.phoneNumber,
  address: data.address,
  updatedAt: new Date().toISOString(),
};

// SELLER-SPECIFIC FIELDS
if (originalUser.role === 'seller') {
  if ('companyName' in data) dataToUpdate.companyName = data.companyName;
  if ('phoneNumber' in data) dataToUpdate.phoneNumber = data.phoneNumber;
  if ('address' in data) dataToUpdate.address = data.address;
  if ('companyDescription' in data) dataToUpdate.companyDescription = data.companyDescription;
  if ('taxId' in data) dataToUpdate.taxId = data.taxId;
  if ('businessType' in data) dataToUpdate.businessType = data.businessType;
  if ('exportScope' in data) dataToUpdate.exportScope = data.exportScope;
  if ('verificationDetails' in data) dataToUpdate.verificationDetails = data.verificationDetails;
}

// BUYER-SPECIFIC FIELDS
if (originalUser.role === 'buyer') {
  if ('jobTitle' in data) dataToUpdate.jobTitle = data.jobTitle;
  if ('companyDescription' in data) dataToUpdate.companyDescription = data.companyDescription;
  if ('companyWebsite' in data) dataToUpdate.companyWebsite = data.companyWebsite;
  if ('address' in data) dataToUpdate.address = data.address;
  if ('shippingAddress' in data) dataToUpdate.shippingAddress = data.shippingAddress;
  if ('taxId' in data) dataToUpdate.taxId = data.taxId;
  if ('businessType' in data) dataToUpdate.businessType = data.businessType;
  if ('exportScope' in data) dataToUpdate.exportScope = data.exportScope;
  if ('verificationDetails' in data) dataToUpdate.verificationDetails = data.verificationDetails;

  if ('billingSameAsShipping' in data) {
    dataToUpdate.billingSameAsShipping = data.billingSameAsShipping;

    if (data.billingSameAsShipping) {
      dataToUpdate.billingAddress = data.shippingAddress;
    } else if ('billingAddress' in data) {
      dataToUpdate.billingAddress = data.billingAddress;
    }
  }
}

    


    // --- Verification Logic ---
    // Start with the existing verification status.
    dataToUpdate.verificationStatus = originalUser.verificationStatus || 'unverified';
    dataToUpdate.verified = originalUser.verified || false;

    // CRITICAL FIX: Only trigger re-verification if the user is currently 'verified'.
    // If they are 'pending' or 'rejected', edits should not change this status automatically.
    if (originalUser.verificationStatus === 'verified') {
        const requiresReverification = (
            originalUser.address?.country !== data.address?.country ||
            originalUser.companyName !== data.companyName ||
            !areDetailsEqual(originalUser.verificationDetails, data.verificationDetails)
        );

        if (requiresReverification) {
            dataToUpdate.verificationStatus = 'pending';
            dataToUpdate.verified = false;
        }
    }
    
    await userRef.update(dataToUpdate);
    
/*
    const updatedUserSnap = await userRef.get();
    const updatedUser = { id: updatedUserSnap.id, ...updatedUserSnap.data() } as User;

    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true, user: updatedUser };
*/

const updatedUserSnap = await userRef.get();
const rawUserData = updatedUserSnap.data() as any;

const updatedUser: User = {
  id: updatedUserSnap.id,
  ...rawUserData,

  // 🔑 Convert Firestore Timestamp → serializable values
  subscriptionExpiryDate: rawUserData.subscriptionExpiryDate
    ? rawUserData.subscriptionExpiryDate.toDate().toISOString()
    : null,

  // (Optional safety if these exist)
  createdAt: rawUserData.createdAt?.toDate?.().toISOString() ?? rawUserData.createdAt ?? null,
  updatedAt: rawUserData.updatedAt?.toDate?.().toISOString() ?? rawUserData.updatedAt ?? null,
};

revalidatePath('/profile');
revalidatePath(`/sellers/${userId}`);

return { success: true, user: updatedUser };

    
  } catch (error: any) {
    console.error(`--- DEBUG: updateUserProfile CRASHED for user ${userId} ---`);
    console.error('--- DEBUG: Error Code:', error.code);
    console.error('--- DEBUG: Error Message:', error.message);
    
    const errorMessage = error.message || 'Failed to update profile on the server. Please check the server logs.';
    return { success: false, error: errorMessage };
  }
}

export async function submitVerificationDocuments(formData: FormData, token: string): Promise<{ success: true } | { success: false; error: string }> {
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
      docUpdates['verified'] = false;
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
    
    // revalidatePath('/profile/verification');
    // revalidatePath('/profile');

    const updatedUserSnap = await userRef.get();
    const updatedUser = { id: updatedUserSnap.id, uid: userId, ...updatedUserSnap.data() } as User;
    //return { success: true, updatedUser };
    return { success: true };

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
    
    const { plan, user } = await getPlanAndUser(planId, userId);
    const userRef = adminDb.collection('users').doc(userId);
    
    const currentExpiry = user.subscriptionExpiryDate ? new Date(user.subscriptionExpiryDate) : new Date();
    const renewalBaseDate = isFuture(currentExpiry) ? currentExpiry : new Date();
    const expiryDate = add(renewalBaseDate, { years: 1 });

    const batch = adminDb.batch();

    batch.update(userRef, {
      subscriptionPlanId: planId,
      subscriptionExpiryDate: firestore.Timestamp.fromDate(expiryDate), // Save as Timestamp
      renewalCancelled: false, // Ensure renewal is active on new purchase
    });
    
    console.log(`Stripe Yearly: Successfully updated subscription for user ${userId} to plan ${planId}, expiring on ${expiryDate.toISOString()}.`);
    
    // The invoice creation is now part of the same transaction
    await createSubscriptionInvoice({
        user,
        plan,
        paymentDetails: {
            provider: 'stripe',
            paymentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        }
    });

    await batch.commit();

    revalidatePath('/profile/subscription');
    revalidatePath('/profile/invoices');
    revalidatePath('/(app)/layout'); // Revalidate layout to update user nav

    return { success: true };

  } catch (error: any) {
    console.error('Error confirming Stripe payment:', error);
    return { success: false, error: error.message || 'Failed to confirm payment on server.' };
  }
}


export async function manageSubscriptionRenewal(
  userId: string,
  action: 'cancel' | 'reactivate'
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return { success: false, error: 'User not found.' };
    }

    const renewalCancelled = action === 'cancel';
    await userRef.update({ renewalCancelled });

    revalidatePath('/profile/subscription');

    return { success: true };
  } catch (error: any) {
    console.error(`Error trying to ${action} subscription for user ${userId}:`, error);
    return { success: false, error: `Could not ${action} subscription.` };
  }
}

export async function processAcceptedOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const offerSnap = await adminDb.collection('offers').doc(offerId).get();
        if (!offerSnap.exists) {
            throw new Error("Offer not found.");
        }
        const offer = offerSnap.data() as Offer;

        if (offer.status !== 'accepted') {
            console.warn(`processAcceptedOffer called for an offer that is not accepted. Status: ${offer.status}`);
            return { success: true }; // Not an error, just nothing to do.
        }

        const [buyer, seller] = await Promise.all([
            getUser(offer.buyerId),
            getUser(offer.sellerId)
        ]);

        if (!buyer || !seller) {
            throw new Error("Could not retrieve buyer or seller profiles.");
        }

        const contactCardMessage = `
            <b>Offer Accepted!</b><br/>
            Here is the contact information to finalize your transaction:<br/><br/>
            <b>Seller Details:</b><br/>
            Name: ${seller.name}<br/>
            Company: ${seller.companyName || 'N/A'}<br/>
            Email: ${seller.email}<br/>
            Phone: ${seller.phoneNumber || 'N/A'}<br/><br/>
            <b>Buyer Details:</b><br/>
            Name: ${buyer.name}<br/>
            Company: ${buyer.companyName || 'N/A'}<br/>
            Email: ${buyer.email}<br/>
            Phone: ${buyer.phoneNumber || 'N/A'}
        `;

        // Send the contact card message as the system
        const messageRef = adminDb.collection('conversations').doc(offer.conversationId).collection('messages').doc();
        const conversationRef = adminDb.collection('conversations').doc(offer.conversationId);
        
        const batch = adminDb.batch();

        batch.set(messageRef, {
            conversationId: offer.conversationId,
            senderId: 'system',
            text: contactCardMessage,
            timestamp: firestore.FieldValue.serverTimestamp(),
            isQuoteRequest: true, // Use this flag to render HTML
        });

        // Also update the last message in the conversation
        batch.update(conversationRef, {
            'lastMessage.text': 'Contact information has been shared.',
            'lastMessage.senderId': 'system',
            'lastMessage.timestamp': firestore.FieldValue.serverTimestamp(),
        });
        
        await batch.commit();

        // Send email notifications
        await sendOfferAcceptedEmail({ buyer, seller, offer });
        
        revalidatePath(`/messages/${offer.conversationId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error processing accepted offer on server:", error);
        return { success: false, error: 'Failed to process the accepted offer on the server.' };
    }
}
