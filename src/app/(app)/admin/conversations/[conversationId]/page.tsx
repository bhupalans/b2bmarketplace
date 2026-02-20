
import { getConversationForAdmin, getUsersByIds } from "@/lib/database";
import { AdminMessageView } from "./admin-message-view";
import { User } from "@/lib/types";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";

export default async function AdminConversationPage({
  params,
}: {
  params: { conversationId: string };
}) {

  const conversation = await getConversationForAdmin(params.conversationId);
  if (!conversation) {
    notFound();
  }

  const userMap = await getUsersByIds(conversation.participantIds);
  const participants = Array.from(userMap.values());

  const serializableConversation = {
      ...conversation,
      createdAt: conversation.createdAt instanceof Timestamp ? conversation.createdAt.toDate().toISOString() : null,
      lastMessage: conversation.lastMessage ? {
          ...conversation.lastMessage,
          timestamp: conversation.lastMessage.timestamp instanceof Timestamp ? conversation.lastMessage.timestamp.toDate().toISOString() : null,
      } : null,
  }

  return (
    <AdminMessageView
      conversation={serializableConversation}
      initialParticipants={participants}
    />
  );
}
