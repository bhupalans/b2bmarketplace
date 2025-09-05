
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This defines the shape of the data we expect from the profile form.
// We omit fields that shouldn't be changed directly by the user on this form.
type ProfileUpdateData = Omit<User, 'id' | 'uid' | 'email' | 'role' | 'avatar' | 'verified' | 'memberSince' | 'username'>;

export async function updateUserProfile(userId: string, data: ProfileUpdateData) {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    
    // Construct the data to be updated in a straightforward manner.
    // This new structure avoids complex merging and directly sets the data from the form.
    const updateData = {
        name: data.name,
        companyName: data.companyName,
        phoneNumber: data.phoneNumber,
        companyDescription: data.companyDescription,
        taxId: data.taxId,
        businessType: data.businessType,
        exportScope: data.exportScope,
        address: data.address,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        verificationDetails: data.verificationDetails
    };

    // Use a transaction to ensure atomicity, though a simple update is likely sufficient.
    // This is more robust.
    await adminDb.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new Error('User not found.');
        }
        transaction.update(userRef, updateData);
    });

    // Revalidate paths where user data might be displayed to ensure freshness
    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile on the server.' };
  }
}
