
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
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return { success: false, error: 'User profile not found.' };
    }

    const user = userSnap.data() as User;

    // --- Uniqueness Check for Verification Details ---
    if (user.role === 'seller' && data.verificationDetails) {
      const details = data.verificationDetails;
      for (const key in details) {
        const value = details[key];
        if (value) { // Only check if a value is provided
          // This query is simplified to avoid needing a composite index.
          const query = adminDb.collection('users')
            .where(`verificationDetails.${key}`, '==', value)
            .limit(2); // Limit to 2 to efficiently check for duplicates.
          
          const snapshot = await query.get();
          
          // Check if any of the results found belong to a *different* user.
          const isDuplicate = snapshot.docs.some(doc => doc.id !== userId);

          if (isDuplicate) {
            // A duplicate was found for this key-value pair.
            const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return { 
              success: false, 
              error: `This ${fieldLabel} is already registered to another seller.` 
            };
          }
        }
      }
    }
    // --- End of Uniqueness Check ---


    const updateData: { [key: string]: any } = {};

    // Map all direct properties from the form data to the update object
    // This ensures we only try to update fields that were actually on the form
    const directProperties: (keyof ProfileUpdateData)[] = [
      'name', 'companyName', 'phoneNumber', 'companyDescription',
      'taxId', 'businessType', 'exportScope', 'verificationDetails',
    ];

    directProperties.forEach(prop => {
      if (data[prop] !== undefined) {
        updateData[prop] = data[prop];
      }
    });
    
    // Explicitly handle each address type to avoid errors with undefined values
    if (data.address) {
      updateData.address = data.address;
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
