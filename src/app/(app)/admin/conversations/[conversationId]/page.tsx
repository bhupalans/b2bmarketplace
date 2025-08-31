
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, notFound } from "next/navigation";
import { useAuth } from '@/contexts/auth-context';
import { getConversationForAdminClient, getUsersByIdsClient } from "@/lib/firebase";
import { Conversation, User } from '@/lib/types';
import { AdminMessageView } from "./admin-message-view";
import { Loader2 } from 'lucide-react';

export default function AdminConversationDetailPage() {
    const params = useParams();
    const conversationId = params.conversationId as string;
    const { user, loading: authLoading } = useAuth();

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [participants, setParticipants] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user || user.role !== 'admin') {
            setLoading(false);
            setError("You do not have permission to view this page.");
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const fetchedConversation = await getConversationForAdminClient(conversationId);
                if (!fetchedConversation) {
                    setError("Conversation not found.");
                    setLoading(false);
                    return;
                }

                const participantMap = await getUsersByIdsClient(fetchedConversation.participantIds);

                setConversation(fetchedConversation);
                setParticipants(Array.from(participantMap.values()));

            } catch (err: any) {
                console.error("Error fetching admin conversation details:", err);
                setError("Failed to load conversation data.");
            } finally {
                setLoading(false);
            }
        }
        
        fetchData();

    }, [conversationId, user, authLoading]);

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-full"><p>{error}</p></div>;
    }
    
    if (!conversation) {
        notFound();
    }

    return (
        <AdminMessageView
            conversation={conversation}
            participants={participants}
        />
    )
}
