
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Conversation, Message, User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { streamMessagesForAdmin } from "@/lib/firebase";

interface AdminMessageViewProps {
    conversation: Conversation;
    participants: User[];
}

export function AdminMessageView({ conversation, participants }: AdminMessageViewProps) {
  const router = useRouter();
  const participantMap = new Map(participants.map(p => [p.id, p]));
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversation.id) return;
    
    setLoadingMessages(true);
    const unsubscribe = streamMessagesForAdmin(conversation.id, (newMessages) => {
        setMessages(newMessages);
        setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [conversation.id]);

  React.useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const getParticipant = (id: string) => {
    return participantMap.get(id);
  }

  const participantNames = participants.map(p => p.name).join(' & ');

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)*2)] flex-col">
       <header className="flex items-center gap-4 border-b bg-background p-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/admin/conversations')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex -space-x-2 overflow-hidden">
            {participants.map(p => (
                 <Avatar key={p.id} className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={p.avatar} alt={p.name} />
                    <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
            ))}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{participantNames}</p>
          <p className="text-sm text-muted-foreground">
            Regarding: <Link href={`/products/${conversation.productId}`} className="hover:underline">{conversation.productTitle}</Link>
          </p>
        </div>
      </header>

       <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        ) : (
            messages.map((message) => {
            const sender = getParticipant(message.senderId);
            if (!sender) return null; // Should not happen

            return (
                <div
                    key={message.id}
                    className="flex items-end gap-2"
                >
                    <Avatar className="h-8 w-8 border">
                        <AvatarImage src={sender.avatar} alt={sender.name} />
                        <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div
                    className="max-w-xs rounded-lg px-4 py-2 md:max-w-md bg-muted"
                    >
                    <p className="font-semibold text-sm">{sender.name}</p>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                        {message.timestamp ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true }) : '...'}
                    </p>
                    </div>
                </div>
            )
            })
        )}
         <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
