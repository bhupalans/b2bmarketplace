
'use server';

import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

type ProfileUpdateData = Omit<User, 'id' | 'uid' | 'email' | 'role' | 'avatar' | 'memberSince' | 'username'>;

export async function updateUserProfile(userId: string, data: ProfileUpdateData) {
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

    if (user.role === 'seller' && data.verificationDetails) {
      const details = data.verificationDetails;
      for (const key in details) {
        const value = details[key];
        if (value) {
          const query = adminDb.collection('users')
            .where(`verificationDetails.${key}`, '==', value)
            .limit(2);
          
          const snapshot = await query.get();
          
          const isDuplicate = snapshot.docs.some(doc => doc.id !== userId);

          if (isDuplicate) {
            const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return { 
              success: false, 
              error: `This ${fieldLabel} is already registered to another seller.` 
            };
          }
        }
      }
    }

    const updateData: { [key: string]: any } = {
        updatedAt: new Date().toISOString()
    };

    const directProperties: (keyof ProfileUpdateData)[] = [
      'name', 'companyName', 'phoneNumber', 'companyDescription',
      'taxId', 'businessType', 'exportScope', 'verificationDetails',
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

    // If address is updated, and user is a seller, clear verification documents
    // as requirements may have changed for the new country.
    if (data.address?.country && data.address.country !== user.address?.country) {
      updateData.verificationStatus = 'unverified';
      updateData.verificationDocuments = {};
    }

    await userRef.update(updateData);

    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true };
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

    if (Object.keys(uploadedDocs).length > 0) {
      await userRef.update({
        verificationStatus: 'pending',
        verificationDocuments: { ...user.verificationDocuments, ...uploadedDocs }
      });
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
