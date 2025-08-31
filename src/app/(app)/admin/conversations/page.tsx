
"use client";

import { MessageSquare } from "lucide-react";
import { AdminConversationList } from "./admin-conversation-list";

export default function MessagesPage() {
    // On mobile, this page shows the list. On desktop, the list is in the layout.
    // This component handles the content for the main panel on both.
  return (
    <>
      {/* Mobile view: Show conversation list */}
      <div className="md:hidden">
        <AdminConversationList />
      </div>

      {/* Desktop view: Show placeholder */}
      <div className="hidden h-full flex-col items-center justify-center bg-muted/50 md:flex">
        <MessageSquare className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Select a conversation</h2>
        <p className="text-muted-foreground">
          Choose a conversation from the list to view its messages.
        </p>
      </div>
    </>
  );
}
