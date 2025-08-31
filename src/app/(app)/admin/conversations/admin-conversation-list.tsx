
"use client";

import React, { useState } from "react";
import { Conversation, User } from "@/lib/types";
import { MessageSquare, Users, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Input } from "@/components/ui/input";

type PopulatedConversation = Conversation & { participants: User[] };

interface AdminConversationListProps {
    conversations: PopulatedConversation[];
}

export function AdminConversationList({ conversations }: AdminConversationListProps) {
  const params = useParams();
  const activeConversationId = params.conversationId;
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter(c => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesParticipant = c.participants.some(p => p.name.toLowerCase().includes(lowerSearchTerm));
    const matchesProduct = c.productTitle?.toLowerCase().includes(lowerSearchTerm);
    return matchesParticipant || matchesProduct;
  });

  return (
     <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold tracking-tight">All Conversations</h2>
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
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
                When users start chatting, their conversations will appear here.
            </p>
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {filteredConversations.map((conv) => {
              const participantNames = conv.participants.map(p => p.name).join(', ');
              return (
              <Link
                key={conv.id}
                href={`/admin/conversations/${conv.id}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                  activeConversationId === conv.id && "bg-accent text-accent-foreground"
                )}
              >
                <Users className="h-10 w-10 text-muted-foreground mt-1" />

                <div className="flex-1 truncate">
                  <p className="font-semibold text-foreground truncate" title={participantNames}>{participantNames}</p>
                  <p className="text-sm truncate">Product: {conv.productTitle}</p>
                  <p className="text-sm truncate text-muted-foreground/80 mt-1">{conv.lastMessage?.text}</p>
                </div>
                 {conv.lastMessage?.timestamp && (
                    <div className="text-xs text-muted-foreground self-start mt-1">
                        {formatDistanceToNow(conv.lastMessage.timestamp.toDate(), { addSuffix: false })}
                    </div>
                )}
              </Link>
            )})}
          </nav>
        )}
      </div>
     </div>
  );
}
