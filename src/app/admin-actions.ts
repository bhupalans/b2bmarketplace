
'use server';

import { adminDb } from "@/lib/firebase-admin";
import { User, Message } from "@/lib/types";
import { format } from 'date-fns';

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

        // Firestore 'in' query is limited to 30 items. Chunking may be needed for very large conversations with many participants.
        const userDocs = await adminDb.collection('users').where('uid', 'in', Array.from(participantIds)).get();
        const userMap = new Map<string, User>();
        userDocs.forEach(doc => {
            userMap.set(doc.id, { id: doc.id, uid: doc.id, ...doc.data() } as User);
        });

        const csvHeader = 'Timestamp,Sender Name,Message\n';
        const csvRows = messages.map(msg => {
            const senderName = userMap.get(msg.senderId)?.name || 'Unknown User';
            
            // Robustly handle timestamp conversion
            const timestamp = msg.timestamp && typeof msg.timestamp.toDate === 'function' 
              ? format(msg.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') 
              : 'N/A';

            const cleanMessage = `"${(msg.text || '').replace(/"/g, '""')}"`; // Escape double quotes and handle undefined text

            return [timestamp, senderName, cleanMessage].join(',');
        });

        const csvContent = csvHeader + csvRows.join('\n');
        
        return { success: true, csvContent };

    } catch (error: any) {
        console.error('Error downloading conversation:', error);
        return { success: false, error: 'Failed to generate conversation file. Check server logs.' };
    }
}


export {};
