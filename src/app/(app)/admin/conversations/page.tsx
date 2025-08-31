
import { getAllConversationsForAdmin, getUsersByIds } from "@/lib/database";
import { AdminConversationList } from "./admin-conversation-list";
import { User, Message } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

// A version of the Conversation type that is safe to pass from Server to Client Components
type SerializableConversation = Omit<import('@/lib/types').Conversation, 'createdAt' | 'lastMessage'> & {
    createdAt: string | null;
    lastMessage: (Omit<Message, 'timestamp'> & { timestamp: string | null }) | null;
    participants: User[];
};

export default async function AdminConversationsPage() {
    // This is now a Server Component, fetching data before rendering.
    const fetchedConversations = await getAllConversationsForAdmin();

    const allParticipantIds = fetchedConversations.reduce((acc, conv) => {
        conv.participantIds.forEach(id => acc.add(id));
        return acc;
    }, new Set<string>());
    
    const userMap = await getUsersByIds(Array.from(allParticipantIds));

    const serializableConversations: SerializableConversation[] = fetchedConversations.map(conv => {
        const participants = conv.participantIds.map(id => userMap.get(id)).filter(Boolean) as User[];
        // Ensure the UID is present for client-side logic if needed
        participants.forEach(p => p.uid = p.id);
        
        const serializableLastMessage = conv.lastMessage
            ? { 
                  ...conv.lastMessage, 
                  timestamp: conv.lastMessage.timestamp instanceof Timestamp 
                      ? conv.lastMessage.timestamp.toDate().toISOString() 
                      : null 
              }
            : null;

        return { 
            ...conv, 
            createdAt: conv.createdAt instanceof Timestamp ? conv.createdAt.toDate().toISOString() : null,
            lastMessage: serializableLastMessage,
            participants 
        };
    });

    return (
        <div className="h-full">
            <AdminConversationList conversations={serializableConversations} />
        </div>
    );
}
