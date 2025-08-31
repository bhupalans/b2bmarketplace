
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Conversation, Message, User } from "@/lib/types";
import { Loader2, User as UserIcon, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Input } from "@/components/ui/input";
import { getAllConversationsForAdminClient } from "@/lib/firebase";

type SerializableConversation = Omit<import('@/lib/types').Conversation, 'createdAt' | 'lastMessage'> & {
    createdAt: string | null;
    lastMessage: (Omit<Message, 'timestamp'> & { timestamp: string | null }) | null;
    participants: User[];
};

export function AdminConversationList() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const activeConversationId = params.conversationId;

  const [conversations, setConversations] = useState<SerializableConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
        if (!user || user.role !== 'admin') {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // This is a new client-side fetcher for admin.
            // We can add server-side fetching later if needed.
            const convos = await getAllConversationsForAdminClient();
            if (isMounted) {
                setConversations(convos as SerializableConversation[]);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    }
    
    if (user && !authLoading) {
        fetchData();
    }

    return () => { isMounted = false; }
  }, [user, authLoading]);
  
  const filteredConversations = conversations.filter(c => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesParticipant = c.participants?.some(p => p.name.toLowerCase().includes(lowerSearchTerm));
    const matchesProduct = c.productTitle?.toLowerCase().includes(lowerSearchTerm);
    return matchesParticipant || matchesProduct;
  });

  return (
     <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
        <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by user or product..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">No conversations found</p>
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {filteredConversations.map((conv) => {
                const participantNames = conv.participants?.map(p => p.name).join(' & ') || 'Unknown Participants';
                const lastMessageTimestamp = conv.lastMessage?.timestamp;
                return (
                <Link
                    key={conv.id}
                    href={`/admin/conversations/${conv.id}`}
                    className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                    activeConversationId === conv.id && "bg-accent text-accent-foreground"
                    )}
                >
                    <div className="flex-1 truncate">
                        <p className="font-semibold text-foreground truncate">{participantNames}</p>
                        <p className="text-sm truncate text-primary/80">{conv.productTitle}</p>
                        <p className="text-sm truncate mt-1">{conv.lastMessage?.text}</p>
                    </div>
                    {lastMessageTimestamp && (
                        <div className="text-xs text-muted-foreground self-start mt-1 whitespace-nowrap">
                            {formatDistanceToNow(parseISO(lastMessageTimestamp), { addSuffix: true })}
                        </div>
                    )}
                </Link>
                )
            })}
          </nav>
        )}
      </div>
     </div>
  );
}
