
"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getConversation, sendMessage, streamMessages, getSellerProductsClient } from "@/lib/firebase";
import { Conversation, Message, User, Product } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ArrowLeft, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from 'date-fns';
import { OfferCard } from "@/components/offer-card";
import { useToast } from "@/hooks/use-toast";
import { suggestOfferAction } from "@/app/actions";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [isSuggesting, startSuggestionTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }

    let unsubscribeMessages: (() => void) | undefined;

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

        if (user.role === 'seller') {
          const products = await getSellerProductsClient(user.uid);
          setSellerProducts(products);
        }

        unsubscribeMessages = streamMessages(conversationId, (newMessages) => {
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
      if (unsubscribeMessages) {
        unsubscribeMessages();
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

  const handleSuggestOffer = () => {
    if (!conversation || !otherParticipant) return;

    startSuggestionTransition(async () => {
        const chatHistory = messages.map(m => `${m.senderId === user?.id ? 'Seller' : 'Buyer'}: ${m.text}`).join('\n');
        const result = await suggestOfferAction(conversation.id, chatHistory, sellerProducts);

        if (result.success && result.suggestion) {
            const { productId, quantity, pricePerUnit } = result.suggestion;
            const query = new URLSearchParams();
            if (productId) query.set('productId', productId);
            if (quantity) query.set('quantity', quantity.toString());
            if (pricePerUnit) query.set('price', pricePerUnit.toString());
            query.set('buyerId', otherParticipant.id);
            query.set('conversationId', conversation.id);
            
            router.push(`/offers?${query.toString()}`);
        } else {
            toast({
                variant: 'destructive',
                title: 'Suggestion Failed',
                description: result.error || 'The AI could not generate an offer suggestion from this conversation.',
            });
        }
    });
  }
  
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
        {user?.role === 'seller' && (
          <Button variant="outline" onClick={handleSuggestOffer} disabled={isSuggesting}>
            {isSuggesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Wand2 className="mr-2 h-4 w-4" />
            )}
            Suggest Offer
          </Button>
        )}
      </header>

       <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
            if (message.offerId) {
                return <OfferCard key={message.id} offerId={message.offerId} currentUserId={user!.id} />;
            }
            return (
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
            )
        })}
         <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background p-4">
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
