
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
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        return { success: false, error: 'User not found.' };
    }
    
    const existingData = userDoc.data() as User;

    // Create a new object for the update, ensuring address and verification details are handled correctly
    const updateData: any = { // Use 'any' to dynamically build the object
        name: data.name,
        companyName: data.companyName,
        phoneNumber: data.phoneNumber,
        companyDescription: data.companyDescription,
        taxId: data.taxId,
        businessType: data.businessType,
        exportScope: data.exportScope,
        // Deep merge verification details to avoid overwriting existing keys
        verificationDetails: {
            ...existingData.verificationDetails,
            ...data.verificationDetails,
        }
    };
    
    // Conditionally add address fields to avoid 'undefined' errors in Firestore
    if (data.address) {
        updateData.address = data.address;
    }
    if (data.shippingAddress) {
        updateData.shippingAddress = data.shippingAddress;
    }
    if (data.billingAddress) {
        updateData.billingAddress = data.billingAddress;
    }


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
