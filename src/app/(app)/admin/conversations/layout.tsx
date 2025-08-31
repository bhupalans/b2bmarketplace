
import { getAllConversationsForAdmin } from "@/lib/database";
import { AdminConversationList } from "./admin-conversation-list";
import { Conversation, Message, User } from "@/lib/types";
import { getUsersByIds } from "@/lib/database";
import { Timestamp } from "firebase-admin/firestore";

type SerializableConversation = Omit<import('@/lib/types').Conversation, 'createdAt' | 'lastMessage' | 'otherParticipant'> & {
    createdAt: string | null;
    lastMessage: (Omit<Message, 'timestamp'> & { timestamp: string | null }) | null;
    participants: User[];
};


export default async function AdminConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawConversations = await getAllConversationsForAdmin();
  
  const participantIds = new Set<string>();
  rawConversations.forEach(conv => {
    conv.participantIds.forEach(id => participantIds.add(id));
  });

  const userMap = await getUsersByIds(Array.from(participantIds));

  const conversations: SerializableConversation[] = rawConversations.map(conv => {
    const participants = conv.participantIds.map(id => userMap.get(id)).filter(Boolean) as User[];
    return {
        ...conv,
        createdAt: conv.createdAt instanceof Timestamp ? conv.createdAt.toDate().toISOString() : null,
        lastMessage: conv.lastMessage ? {
            ...conv.lastMessage,
            timestamp: conv.lastMessage.timestamp instanceof Timestamp ? conv.lastMessage.timestamp.toDate().toISOString() : null,
        } : null,
        participants,
    };
  });


  return (
    <div className="grid h-[calc(100vh-theme(spacing.14)*2)] grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[380px_1fr]">
      <aside className="hidden md:block border-r">
          <AdminConversationList conversations={conversations} />
      </aside>
      <main>
          {children}
      </main>
    </div>
  );
}
