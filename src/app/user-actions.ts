
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
    
    // Create a new object for the update, ensuring address is handled correctly
    const updateData = {
        name: data.name,
        companyName: data.companyName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        companyDescription: data.companyDescription,
        taxId: data.taxId,
        businessType: data.businessType,
        verificationDetails: data.verificationDetails || {},
    };

    await userRef.update(updateData);

    // Revalidate paths where user data might be displayed to ensure freshness
    revalidatePath('/profile');
    revalidatePath(`/sellers/${userId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile on the server.' };
  }
}
