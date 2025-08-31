
"use client";

import { useEffect, useState } from 'react';
import { getAllConversationsForAdminClient, getUsersByIdsClient } from "@/lib/firebase";
import { Conversation, User } from "@/lib/types";
import { AdminConversationList } from "./admin-conversation-list";
import { MessagesSquare, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';

type PopulatedConversation = Conversation & { participants: User[] };

export default function AdminConversationsPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
                    return { ...conv, participants };
                });

                setConversations(conversationsWithDetails);
            } catch (error) {
                console.error("Failed to fetch conversations for admin:", error);
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            fetchData();
        }
    }, [user]);

    if (loading) {
        return (
            <>
                <aside className="hidden md:block border-r">
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                </aside>
                <main>
                    <div className="hidden h-full flex-col items-center justify-center bg-muted/50 md:flex">
                        <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
                        <h2 className="mt-4 text-xl font-semibold">Loading Conversations...</h2>
                    </div>
                </main>
            </>
        )
    }

    if (user?.role !== 'admin') {
        return (
             <div className="flex justify-center items-center h-full col-span-2">
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }
    
    return (
        <>
            <aside className="hidden md:block border-r">
                <AdminConversationList conversations={conversations} />
            </aside>
            <main>
                 <div className="hidden h-full flex-col items-center justify-center bg-muted/50 md:flex">
                    <MessagesSquare className="h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Select a conversation</h2>
                    <p className="text-muted-foreground">
                    Choose a conversation from the list to view its contents.
                    </p>
                </div>
            </main>
        </>
    )
}
