
import { getAllConversationsForAdmin, getUsersByIds } from "@/lib/database";
import { Conversation } from "@/lib/types";
import { AdminConversationList } from "./admin-conversation-list";
import { MessagesSquare } from "lucide-react";

export default async function AdminConversationsPage() {
    
    const conversations = await getAllConversationsForAdmin();

    // Collect all unique participant IDs from all conversations
    const allParticipantIds = conversations.reduce((acc, conv) => {
        conv.participantIds.forEach(id => acc.add(id));
        return acc;
    }, new Set<string>());

    // Fetch all user profiles for these participants in one go
    const userMap = await getUsersByIds(Array.from(allParticipantIds));
    
    // Attach participant details to each conversation
    const conversationsWithDetails = conversations.map(conv => {
        const participants = conv.participantIds.map(id => userMap.get(id)).filter(Boolean);
        return { ...conv, participants };
    }) as (Conversation & { participants: any[] })[];


    return (
        <>
            <aside className="hidden md:block border-r">
                <AdminConversationList conversations={conversationsWithDetails} />
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
