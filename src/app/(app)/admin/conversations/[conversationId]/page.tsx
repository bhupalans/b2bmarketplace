
import React from 'react';
import { notFound } from "next/navigation";
import { getConversationForAdmin, getUsersByIds } from "@/lib/database";
import { AdminMessageView } from "./admin-message-view";

export default async function AdminConversationDetailPage({ params }: { params: { conversationId: string } }) {
    const conversationId = params.conversationId;

    const conversationData = await getConversationForAdmin(conversationId);
    if (!conversationData) {
        notFound();
    }
    
    const { conversation, messages } = conversationData;
    
    // Fetch user details for all participants
    const userMap = await getUsersByIds(conversation.participantIds);
    
    return (
        <AdminMessageView 
            conversation={conversation} 
            initialMessages={messages} 
            participants={Array.from(userMap.values())} 
        />
    )
}
