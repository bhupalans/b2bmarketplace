
"use client";

import { useEffect, useState } from 'react';
import { getAllConversationsForAdminClient, getUsersByIdsClient } from "@/lib/firebase";
import { Conversation, User, Message } from "@/lib/types";
import { AdminConversationList } from "./admin-conversation-list";
import { Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { Timestamp } from 'firebase/firestore';

// A version of the Conversation type that is safe to pass to client components
type SerializableConversation = Omit<Conversation, 'createdAt' | 'lastMessage'> & {
    createdAt: string | null;
    lastMessage: (Omit<Message, 'timestamp'> & { timestamp: string | null }) | null;
    participants: User[];
};


export default function AdminConversationsPage() {
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<SerializableConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        async function fetchData() {
            if (user?.role !== 'admin') {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const fetchedConversations = await getAllConversationsForAdminClient();

                const allParticipantIds = fetchedConversations.reduce((acc, conv) => {
                    conv.participantIds.forEach(id => acc.add(id));
                    return acc;
                }, new Set<string>());
                
                const userMap = await getUsersByIdsClient(Array.from(allParticipantIds));

                const serializableConversations = fetchedConversations.map(conv => {
                    const participants = conv.participantIds.map(id => userMap.get(id)).filter(Boolean) as User[];
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

                setConversations(serializableConversations);
            } catch (error) {
                console.error("Failed to fetch conversations for admin:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user, authLoading]);
    
    if (authLoading || loading) {
      return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (user?.role !== 'admin') {
        return (
             <div className="flex justify-center items-center h-full">
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

  return (
    <div className="h-full">
        <AdminConversationList conversations={conversations} />
    </div>
  );
}
