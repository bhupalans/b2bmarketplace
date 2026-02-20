
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CallbackRequest } from '@/lib/types';
import { sendCallbackRequestEmail } from '@/services/email';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

type CallbackRequestData = Omit<CallbackRequest, 'id' | 'createdAt' | 'status' | 'userId'>;

export async function submitCallbackRequest(data: CallbackRequestData): Promise<{ success: boolean; error?: string }> {
  try {
    const newRequest: Partial<CallbackRequest> = {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    // Check if user is logged in to associate the request
    const session = cookies().get('session')?.value;
    if (session) {
      try {
        const decodedToken = await getAuth().verifySessionCookie(session, true);
        newRequest.userId = decodedToken.uid;
      } catch (error) {
        // Could be an expired cookie, ignore and proceed as anonymous
        console.log("Could not verify session for callback request:", (error as any).message);
      }
    }

    // Save to Firestore
    await adminDb.collection('callbackRequests').add(newRequest);

    // Send email notification
    await sendCallbackRequestEmail(newRequest as Omit<CallbackRequest, 'id'>);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error submitting callback request:", error);
    return { success: false, error: 'Failed to submit your request on the server.' };
  }
}
