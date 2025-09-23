
'use server';

import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { User, VerificationTemplate } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

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

    // This logic is for sellers and buyers, now based on the primary `address` field
    if (countryCode && data.verificationDetails) {
        const templatesSnap = await adminDb.collection('verificationTemplates').doc(countryCode).get();
        if (templatesSnap.exists) {
            const template = templatesSnap.data() as VerificationTemplate;
            const details = data.verificationDetails;

            for (const field of template.fields) {
                const value = details[field.name];
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
                }
            }
        }
    }

    const updateData: { [key: string]: any } = {
        updatedAt: new Date().toISOString(),
        scopedVerificationIds: {} // Reset and rebuild
    };

    // Rebuild scopedVerificationIds
    if (countryCode && data.verificationDetails) {
        const templatesSnap = await adminDb.collection('verificationTemplates').doc(countryCode).get();
        if (templatesSnap.exists) {
            const template = templatesSnap.data() as VerificationTemplate;
            template.fields.forEach(field => {
                const value = data.verificationDetails?.[field.name];
                if (value) {
                    const scopedKey = `${field.name}-${countryCode}`;
                    updateData.scopedVerificationIds[scopedKey] = value;
                }
            });
        }
    }


    const directProperties: (keyof ProfileUpdateData)[] = [
      'name', 'companyName', 'phoneNumber', 'companyDescription',
      'taxId', 'businessType', 'exportScope', 'verificationDetails',
      'jobTitle', 'companyWebsite', 'billingSameAsShipping'
    ];

    directProperties.forEach(prop => {
      if (data[prop] !== undefined) {
        updateData[prop] = data[prop];
      }
    });
    
    if (data.address) {
      updateData.address = data.address;
    }
     if (data.shippingAddress) {
      updateData.shippingAddress = data.shippingAddress;
    }
     if (data.billingAddress) {
      updateData.billingAddress = data.billingAddress;
    }
    
    const previousCountry = user.address?.country;
    const newCountry = data.address?.country;

    // If primary address country changes, verification needs to be redone.
    if (newCountry && newCountry !== previousCountry) {
      updateData.verificationStatus = 'unverified';
      updateData.verificationDocuments = {};
    }

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

export async function submitVerificationDocuments(formData: FormData, token: string) {
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
    
    // Clear old address proof fields when a new type is chosen
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

    if (Object.keys(uploadedDocs).length > 0 || Object.keys(docUpdates).length > 0) {
      docUpdates['verificationStatus'] = 'pending';
      if (!docUpdates.verificationDocuments) {
          docUpdates.verificationDocuments = {};
      }
      docUpdates.verificationDocuments = { ...docUpdates.verificationDocuments, ...uploadedDocs };
      
      await userRef.update(docUpdates);

    } else {
        // This case handles re-submission without changing any files.
        await userRef.update({
            verificationStatus: 'pending'
        });
    }
    
    revalidatePath('/profile/verification');
    revalidatePath('/profile');

    const updatedUserSnap = await userRef.get();
    return { success: true, updatedUser: updatedUserSnap.data() as User };

  } catch(error: any) {
    console.error("Error submitting verification docs:", error);
    return { success: false, error: error.message || "Failed to submit documents." };
  }
}
