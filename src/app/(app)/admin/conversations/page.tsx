
"use client";

import { useEffect, useState } from 'react';
import { getAllConversationsForAdminClient, getUsersByIdsClient } from "@/lib/firebase";
import { Conversation, User } from "@/lib/types";
import { AdminConversationList } from "./admin-conversation-list";
import { Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';

type PopulatedConversation = Conversation & { participants: User[] };

export default function AdminConversationsPage() {
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
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

                const conversationsWithDetails = fetchedConversations.map(conv => {
                    const participants = conv.participantIds.map(id => userMap.get(id)).filter(Boolean) as User[];
                    // Ensure each participant object has the uid field for lookups
                    participants.forEach(p => p.uid = p.id);
                    return { ...conv, participants };
                });

                setConversations(conversationsWithDetails);
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
