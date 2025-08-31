
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { streamConversations } from "@/lib/firebase";
import { Conversation } from "@/lib/types";
import { Loader2, MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ConversationList() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const activeConversationId = params.conversationId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (!authLoading && user) {
      setLoading(true);
      unsubscribe = streamConversations(user.uid, (newConversations) => {
        setConversations(newConversations);
        if (loading) setLoading(false);
      });
    } else if (!authLoading && !user) {
      // User is logged out, clear conversations and stop loading.
      setConversations([]);
      setLoading(false);
    }

    // Cleanup function: This is crucial. It runs when the component unmounts
    // OR when the dependencies (user, authLoading) change.
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading]); // Re-run effect when user or authLoading state changes
  
  const filteredConversations = conversations.filter(c => 
    (c.otherParticipant?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.productTitle?.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
     <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
        <div className="relative mt-2">
            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search by name or product..." 
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
            <p className="mt-4 font-semibold">{user ? "No conversations yet" : "Please log in"}</p>
            <p className="text-sm text-muted-foreground">
              {user ? "Start a conversation by contacting a seller on a product page." : "Log in to see your messages."}
            </p>
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {filteredConversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                  activeConversationId === conv.id && "bg-accent text-accent-foreground"
                )}
              >
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={conv.otherParticipant?.avatar} alt={conv.otherParticipant?.name} />
                  <AvatarFallback>{conv.otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  <p className="font-semibold text-foreground truncate">{conv.otherParticipant?.name}</p>
                  <p className="text-sm truncate">{conv.lastMessage?.text || `About: ${conv.productTitle}`}</p>
                </div>
                 {conv.lastMessage?.timestamp && (
                    <div className="text-xs text-muted-foreground self-start mt-1">
                        {formatDistanceToNow(conv.lastMessage.timestamp.toDate(), { addSuffix: false })}
                    </div>
                )}
              </Link>
            ))}
          </nav>
        )}
      </div>
     </div>
  );
}
