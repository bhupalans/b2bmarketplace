
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getConversation, sendMessage, streamMessages } from "@/lib/firebase";
import { Conversation, Message, User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from 'date-fns';


export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const { user, loading: authLoading } = useAuth();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (authLoading || !user) return;

    let unsubscribe: () => void;

    const fetchConversationData = async () => {
      try {
        setLoading(true);
        const convData = await getConversation(conversationId, user.uid);
        if (!convData) {
          router.push("/messages");
          return;
        }
        setConversation(convData.conversation);
        setOtherParticipant(convData.otherParticipant);

        unsubscribe = streamMessages(conversationId, (newMessages) => {
          setMessages(newMessages);
        });
      } catch (error) {
        console.error("Error fetching conversation data:", error);
        router.push("/messages");
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, user, authLoading, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversation) return;

    setIsSending(true);
    try {
        await sendMessage(conversation.id, user.uid, newMessage);
        setNewMessage("");
    } catch (error) {
        console.error("Error sending message:", error);
    } finally {
        setIsSending(false);
    }
  };
  
  if (loading || authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!conversation || !otherParticipant) {
    return <div className="flex h-full items-center justify-center"><p>Conversation not found.</p></div>;
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)*2)] flex-col">
       <header className="flex items-center gap-4 border-b bg-background p-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/messages')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
          <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{otherParticipant.name}</p>
          <p className="text-sm text-muted-foreground">
            Regarding: <Link href={`/products/${conversation.productId}`} className="hover:underline">{conversation.productTitle}</Link>
          </p>
        </div>
      </header>

       <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              message.senderId === user?.uid ? "justify-end" : "justify-start"
            )}
          >
            {message.senderId !== user?.uid && (
                <Avatar className="h-8 w-8 border">
                    <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div
              className={cn(
                "max-w-xs rounded-lg px-4 py-2 md:max-w-md",
                message.senderId === user?.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{message.text}</p>
              <p className={cn("text-xs mt-1", message.senderId === user?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {message.timestamp ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true }) : 'sending...'}
              </p>
            </div>
             {message.senderId === user?.uid && (
                <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
          </div>
        ))}
         <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background p-4">
        {conversation.productImage && conversation.productTitle && (
            <div className="flex items-center gap-2 p-2 mb-2 rounded-md bg-muted text-sm">
                <Image src={conversation.productImage} alt={conversation.productTitle} width={40} height={40} className="rounded" />
                <span>Replying about: <span className="font-semibold">{conversation.productTitle}</span></span>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              autoComplete="off"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
        </form>
      </div>
    </div>
  );
}

