
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

    // This is a more robust way to build the update object.
    // It avoids issues with 'undefined' values which can cause Firestore errors.
    const updateData: { [key: string]: any } = {};

    // Map all the direct properties
    if (data.name) updateData.name = data.name;
    if (data.companyName) updateData.companyName = data.companyName;
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
    if (data.companyDescription) updateData.companyDescription = data.companyDescription;
    if (data.taxId) updateData.taxId = data.taxId;
    if (data.businessType) updateData.businessType = data.businessType;
    if (data.exportScope) updateData.exportScope = data.exportScope;
    if (data.verificationDetails) updateData.verificationDetails = data.verificationDetails;
    
    // Explicitly handle each address type to avoid errors.
    // This correctly handles creating or updating the address objects.
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
    // Provide a more specific error message for debugging if available.
    const errorMessage = error.message || 'Failed to update profile on the server. Please check the server logs.';
    return { success: false, error: errorMessage };
  }
}
