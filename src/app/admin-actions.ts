
'use server';

import { adminDb } from "@/lib/firebase-admin";
import { User, Message, BrandingSettings, SubscriptionPlan } from "@/lib/types";
import { format } from 'date-fns';
import { Timestamp } from "firebase-admin/firestore";
import { getUsersByIds } from "@/lib/database";
import { revalidatePath } from 'next/cache';

export async function getActiveSubscribers(): Promise<User[]> {
    const plansSnapshot = await adminDb.collection('subscriptionPlans').get();
    const planMap = new Map(plansSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as SubscriptionPlan]));

    const usersRef = adminDb.collection('users');
    
    // CORRECTED QUERY: Fetch users with an expiry date in the future.
    // We cannot use a '!=' query on one field and a range query on another.
    const q = usersRef.where('subscriptionExpiryDate', '>', Timestamp.now());
    
    const usersSnapshot = await q.get();

    if (usersSnapshot.empty) {
        return [];
    }

    const subscribers = usersSnapshot.docs
        .map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as User))
        // Filter in code to ensure a plan ID exists, which the previous '!=' query was trying to do.
        .filter(user => !!user.subscriptionPlanId) 
        .map(user => {
            // Join the plan data onto the user object
            if (user.subscriptionPlanId && planMap.has(user.subscriptionPlanId)) {
                user.subscriptionPlan = planMap.get(user.subscriptionPlanId);
            }
            return user;
        });
    
    // Helper function to serialize Firestore Timestamps to ISO strings
    const serializeTimestamps = (data: any): any => {
        if (!data) return data;
        if (data instanceof Timestamp) return data.toDate().toISOString();
        if (Array.isArray(data)) return data.map(serializeTimestamps);
        if (typeof data === 'object') {
            const res: { [key: string]: any } = {};
            for (const key in data) {
                res[key] = serializeTimestamps(data[key]);
            }
            return res;
        }
        return data;
    };

    return serializeTimestamps(subscribers);
}

export async function downloadConversationAction(conversationId: string) {
    if (!conversationId) {
        return { success: false, error: 'Conversation ID is missing.' };
    }

    try {
        const messagesRef = adminDb.collection('conversations').doc(conversationId).collection('messages');
        const messagesSnap = await messagesRef.orderBy('timestamp', 'asc').get();
        if (messagesSnap.empty) {
            return { success: false, error: 'This conversation has no messages.' };
        }

        const messages = messagesSnap.docs.map(doc => doc.data() as Message);

        const participantIds = messages.reduce((acc, msg) => {
            if (msg.senderId) acc.add(msg.senderId);
            return acc;
        }, new Set<string>());

        const userMap = await getUsersByIds(Array.from(participantIds));

        const csvHeader = 'Timestamp,Sender Name,Message\n';
        const csvRows = messages.map(msg => {
            const senderName = userMap.get(msg.senderId)?.name || 'Unknown User';
            
            const timestamp = msg.timestamp instanceof Timestamp && typeof msg.timestamp.toDate === 'function' 
              ? format(msg.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') 
              : 'N/A';

            const cleanMessage = `"${(msg.text || '').replace(/"/g, '""')}"`;

            return [timestamp, senderName, cleanMessage].join(',');
        });

        const csvContent = csvHeader + csvRows.join('\n');
        
        return { success: true, csvContent };

    } catch (error: any) {
        console.error('Error downloading conversation:', error);
        return { success: false, error: 'Failed to generate conversation file. Check server logs.' };
    }
}

export async function updateBrandingSettings(settings: BrandingSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = adminDb.collection('settings').doc('branding');
    await docRef.set(settings, { merge: true });

    // Revalidate paths that use this branding information
    revalidatePath('/'); // Homepage
    revalidatePath('/(app)/layout'); // Main layout for footer/header
    revalidatePath('/layout'); // Root layout for metadata

    return { success: true };
  } catch (error: any) {
    console.error('Error updating branding settings:', error);
    return { success: false, error: 'Failed to save settings on the server.' };
  }
}
