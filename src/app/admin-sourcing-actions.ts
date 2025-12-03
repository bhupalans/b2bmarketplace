
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { getUser } from '@/lib/database';
import { SourcingRequest, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { sendSourcingRequestApprovedEmail, sendSourcingRequestRejectedEmail } from '@/services/email';

export async function updateSourcingRequestStatusAction(
    requestId: string, 
    action: 'approve' | 'reject', 
    reason?: string
): Promise<{ success: boolean; error?: string }> {

    try {
        const requestRef = adminDb.collection('sourcingRequests').doc(requestId);
        
        const updateData: { status: 'active' | 'closed'; rejectionReason?: string } = {
            status: action === 'approve' ? 'active' : 'closed',
        };

        if (action === 'reject' && reason) {
            updateData.rejectionReason = reason;
        }
        
        await requestRef.update(updateData);
        
        // Fetch data for email notification
        const requestSnap = await requestRef.get();
        if (!requestSnap.exists) {
            throw new Error("Sourcing request not found after update.");
        }
        
        const request = requestSnap.data() as SourcingRequest;
        const buyer = await getUser(request.buyerId);
        
        if (!buyer) {
            console.warn(`Could not find buyer with ID ${request.buyerId} to send notification.`);
            return { success: true }; // Still successful, but warn in logs.
        }

        // Send email based on action
        if (action === 'approve') {
            await sendSourcingRequestApprovedEmail({ request, buyer });
        } else {
            await sendSourcingRequestRejectedEmail({ request, buyer, reason: reason || "Your request did not meet our guidelines." });
            
            // Create in-app notification for rejection
            const notificationData = {
                userId: request.buyerId,
                message: `Your sourcing request "${request.title}" was rejected. Reason: ${reason}`,
                link: `/sourcing/my-requests`,
                read: false,
                createdAt: new Date().toISOString(),
            };
            await adminDb.collection('notifications').add(notificationData);
        }

        revalidatePath('/admin/sourcing-approvals');
        revalidatePath('/sourcing');

        return { success: true };

    } catch (error: any) {
        console.error('Error updating sourcing request status:', error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}
