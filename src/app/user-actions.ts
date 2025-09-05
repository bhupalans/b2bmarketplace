
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This defines the shape of the data we expect from the profile form.
type ProfileUpdateData = Omit<User, 'id' | 'uid' | 'email' | 'role' | 'avatar' | 'verified' | 'memberSince' | 'username'>;

export async function updateUserProfile(userId: string, data: ProfileUpdateData) {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    
    // Construct the data to be updated based on the form fields.
    // This approach is explicit and avoids complex merging logic that was causing errors.
    const updateData: Partial<User> = {
        name: data.name,
        companyName: data.companyName,
        phoneNumber: data.phoneNumber,
        companyDescription: data.companyDescription,
        taxId: data.taxId,
        businessType: data.businessType,
        exportScope: data.exportScope,
        verificationDetails: data.verificationDetails
    };

    // Handle address fields based on what's provided in the data.
    // This is robust against null/undefined values.
    if (data.address) {
        updateData.address = data.address;
    }
    if (data.shippingAddress) {
        updateData.shippingAddress = data.shippingAddress;
    }
    if (data.billingAddress) {
        updateData.billingAddress = data.billingAddress;
    }

    // Use a transaction to ensure atomicity. This is best practice.
    await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new Error('User not found.');
        }
        // Use update instead of set with merge to avoid overwriting entire document
        transaction.update(userRef, updateData);
    });

    // Revalidate paths where user data might be displayed to ensure freshness
    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile on the server. Please check the server logs.' };
  }
}
