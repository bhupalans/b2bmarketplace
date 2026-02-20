
'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function testUserUpdate(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    const errorMsg = `Critical Error: User ID is missing or invalid. Received: '${userId}'`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return {
        success: false,
        error: `Firestore document for user with ID '${userId}' not found on the server.`,
      };
    }

    await userRef.update({
      name: 'Test Successful',
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('--- DEBUG: testUserUpdate CRASHED ---');
    console.error('--- DEBUG: User ID:', userId);
    console.error('--- DEBUG: Error Code:', error.code);
    console.error('--- DEBUG: Error Message:', error.message);
    const errorMessage =
      error.message ||
      'The test update failed on the server. Check server logs for details.';
    return { success: false, error: errorMessage };
  }
}
