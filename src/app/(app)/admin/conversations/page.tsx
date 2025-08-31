
"use client";

import { MessagesSquare } from "lucide-react";
import { AdminConversationList } from "./admin-conversation-list";
import { Conversation, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getAllConversationsForAdminClient, getUsersByIdsClient } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

type PopulatedConversation = Conversation & { participants: User[] };

export default function AdminConversationsPage() {
    // This hook and logic are now primarily for the mobile view, where the list is the page content.
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
              const allParticipantIds = new Set<string>();
              fetchedConversations.forEach(c => c.participantIds.forEach(id => allParticipantIds.add(id)));
              const userMap = await getUsersByIdsClient(Array.from(allParticipantIds));
              const populated = fetchedConversations.map(c => ({
                  ...c,
                  participants: c.participantIds.map(id => userMap.get(id)).filter(Boolean) as User[]
              }));
              setConversations(populated);
          } catch (error) {
              console.error("Failed to fetch conversations for admin:", error);
          } finally {
              setLoading(false);
          }
      }
      fetchData();
  }, [user, authLoading]);

    return (
        <>
            {/* Mobile View: Shows the list as the main content */}
            <div className="md:hidden">
              {loading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : user?.role !== 'admin' ? (
                <div className="p-4 text-center">You do not have permission to view this page.</div>
              ) : (
                <AdminConversationList conversations={conversations} />
              )}
            </div>

            {/* Desktop View: Shows placeholder */}
            <div className="hidden h-full flex-col items-center justify-center md:flex">
                <MessagesSquare className="h-16 w-16 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-semibold">Select a conversation</h2>
                <p className="text-muted-foreground">
                Choose a conversation from the list to view its contents.
                </p>
            </div>
        </>
    )
}
