
"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import {
  streamMessagesForAdmin,
} from "@/lib/firebase";
import { Conversation, Message, User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { downloadConversationAction } from "@/app/admin-actions";
import { useRouter } from "next/navigation";

type SerializableConversation = Omit<import('@/lib/types').Conversation, 'createdAt' | 'lastMessage'> & {
    createdAt: string | null;
    lastMessage: (Omit<Message, 'timestamp'> & { timestamp: string | null }) | null;
};

interface AdminMessageViewProps {
  conversation: SerializableConversation;
  initialParticipants: User[];
}

export function AdminMessageView({ conversation, initialParticipants }: AdminMessageViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const participantMap = new Map(initialParticipants.map(p => [p.uid, p]));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    setLoading(true);
    unsubscribe = streamMessagesForAdmin(conversation.id, (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
    });
    return () => unsubscribe && unsubscribe();
  }, [conversation.id]);

  const getParticipant = (id: string) => {
    return participantMap.get(id) || null;
  };

  const handleDownload = (conversationId: string, productTitle: string) => {
    setDownloadingId(conversationId);
    startTransition(async () => {
        const result = await downloadConversationAction(conversationId);
        if (result.success && result.csvContent) {
            const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeTitle = (productTitle || 'conversation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute("href", url);
            link.setAttribute("download", `conv_${safeTitle}_${conversationId.substring(0,5)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: result.error || "An unknown error occurred.",
            });
        }
        setDownloadingId(null);
    });
  }

  const participantNames = initialParticipants.map(p => p.name).join(' & ');

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)*2)] flex-col">
      <header className="flex items-center gap-4 border-b bg-background p-3">
         <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/admin/conversations')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <p className="font-semibold">{participantNames}</p>
          <p className="text-sm text-muted-foreground">
            Regarding:{" "}
            <Link
              href={`/products/${conversation.productId}`}
              className="hover:underline"
            >
              {conversation.productTitle}
            </Link>
          </p>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(conversation.id, conversation.productTitle)}
            disabled={isPending && downloadingId === conversation.id}
        >
            {isPending && downloadingId === conversation.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            Download
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
           <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">This conversation has no messages.</div>
        ) : messages.map((message) => {
          const sender = getParticipant(message.senderId);
          if (!sender) {
              return (
                  <div key={message.id} className="text-center text-xs text-muted-foreground">System message or unknown sender.</div>
              )
          }
          const isSenderAdmin = sender.role === 'admin';
          return (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2",
              isSenderAdmin ? "justify-end" : "justify-start"
            )}
          >
            {!isSenderAdmin && (
                <Avatar className="h-8 w-8 border">
                    <AvatarImage src={sender.avatar} alt={sender.name} />
                    <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div
              className={cn(
                "max-w-xs rounded-lg px-4 py-2 md:max-w-md",
                isSenderAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <p className="font-semibold text-sm">{sender.name}</p>
              <p className="whitespace-pre-wrap">{message.text}</p>
              <p className={cn("text-xs mt-1", isSenderAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {message.timestamp ? format(message.timestamp.toDate(), 'PPp') : 'sending...'}
              </p>
            </div>
             {isSenderAdmin && (
                <Avatar className="h-8 w-8 border">
                    <AvatarImage src={sender.avatar} alt={sender.name} />
                    <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
          </div>
          )
        })}
         <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
