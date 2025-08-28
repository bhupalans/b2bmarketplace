
"use client";

import React, { useEffect, useRef, useState, useActionState, startTransition, Suspense } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from 'next/navigation'
import {
  File,
  ListFilter,
  MoreHorizontal,
  Paperclip,
  PlusCircle,
  Search,
  Send,
  Gavel,
  Wand2,
  Loader2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mockProducts, mockOffers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Message, OfferSuggestion, User } from "@/lib/types";
import { sendMessageAction, suggestOfferAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { OfferCard } from "./offer-card";
import { CreateOfferDialog } from "./create-offer-dialog";
import { useAuth } from "@/contexts/auth-context";
import { getUsers, getMessages } from "@/lib/firestore";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      <span className="sr-only">Send</span>
    </Button>
  );
};

function ChatContent() {
  const { user: loggedInUser } = useAuth();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipientId');

  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestion, setSuggestion] = useState<OfferSuggestion | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const suggestionFormRef = useRef<HTMLFormElement>(null);
  const [isCreateOfferOpen, setCreateOfferOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const [state, formAction] = useActionState(sendMessageAction, {
    error: null,
    message: null,
    modificationReason: null,
  });

  const [suggestionState, suggestionAction] = useActionState(suggestOfferAction, {
    error: null,
    suggestion: null,
  });

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    if (loggedInUser && recipientId) {
      const unsubscribe = getMessages(loggedInUser.id, recipientId, (newMessages) => {
        setMessages(newMessages);
      });
      // Cleanup subscription on component unmount
      return () => unsubscribe();
    }
  }, [loggedInUser, recipientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  

  const usersById = Object.fromEntries(users.map(u => [u.id, u]));

  useEffect(() => {
    if (state.error) {
      toast({
        variant: "destructive",
        title: "Message failed to send",
        description: state.error,
      });
    }
    if (state.message) {
      // Message is now added via real-time listener, but we can clear the form.
      formRef.current?.reset();
    }
    if (state.modificationReason) {
      toast({
        title: "Message Modified",
        description: state.modificationReason,
      });
    }
  }, [state, toast]);

  useEffect(() => {
    if (suggestionState.error) {
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: suggestionState.error,
      });
      setIsSuggesting(false);
    }
    if (suggestionState.suggestion) {
      setSuggestion(suggestionState.suggestion);
      setCreateOfferOpen(true);
      setIsSuggesting(false);
    }
  }, [suggestionState, toast]);

  const handleSuggestOffer = () => {
    setIsSuggesting(true);
    suggestionFormRef.current?.requestSubmit();
  }
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        formRef.current?.requestSubmit();
    }
  };

  const recipient = recipientId ? usersById[recipientId] : null;

  if (!loggedInUser) {
    return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const conversationList = users.filter(user => {
    if (user.id === loggedInUser.id) return false;
    if (loggedInUser.role === 'buyer') return user.role === 'seller';
    if (loggedInUser.role === 'seller') return user.role === 'buyer';
    return false;
  });

  if (!recipient) {
    return (
      <div className="grid min-h-[calc(100vh-8rem)] w-full grid-cols-[260px_1fr] rounded-lg border">
        <div className="flex flex-col border-r bg-muted/40">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="">Conversations</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
             <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {conversationList.map(user => (
                <Link
                  key={user.id}
                  href={`/messages?recipientId=${user.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <div className="font-semibold">{user.name}</div>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex h-full flex-col items-center justify-center bg-muted/40">
           <div className="text-center">
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p className="text-muted-foreground">Choose someone from the list to start chatting.</p>
           </div>
        </div>
      </div>
    );
  }

  const allUsersAndSystem = { ...usersById, system: { id: 'system', name: 'System', avatar: '', email: '', role: 'admin' as const }};

  return (
    <div className="grid min-h-[calc(100vh-8rem)] w-full grid-cols-[260px_1fr] rounded-lg border">
      <div className="flex flex-col border-r bg-muted/40">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="">Conversations</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
             {conversationList.map(user => (
                <Link
                  key={user.id}
                  href={`/messages?recipientId=${user.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    recipientId === user.id && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                >
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <div className="font-semibold">{user.name}</div>
                  </div>
                </Link>
              ))}
          </nav>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-xl">
              {recipient.name}
            </h1>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {loggedInUser.role === 'seller' && (
              <>
                <form ref={suggestionFormRef} action={suggestionAction} className="hidden">
                  <input type="hidden" name="chatHistory" value={messages.map(m => `${allUsersAndSystem[m.senderId]?.name || 'User'}: ${m.text}`).join('\n')} />
                  <input type="hidden" name="sellerId" value={loggedInUser.id} />
                </form>
                <Button variant="outline" size="sm" onClick={handleSuggestOffer} disabled={isSuggesting}>
                  {isSuggesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Suggest Offer
                </Button>

                <CreateOfferDialog
                  suggestion={suggestion}
                  open={isCreateOfferOpen}
                  onOpenChange={setCreateOfferOpen}
                  onClose={() => setSuggestion(null)}
                  recipientId={recipient.id}
                  formAction={formAction}
                />
              </>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.isSystemMessage ? "justify-center" : (message.senderId === loggedInUser.id && "justify-end")
                )}
              >
                {message.senderId !== loggedInUser.id && !message.isSystemMessage && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={allUsersAndSystem[message.senderId]?.avatar} />
                    <AvatarFallback>
                      {allUsersAndSystem[message.senderId]?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs rounded-lg p-3 text-sm",
                    message.isSystemMessage 
                      ? "bg-accent text-accent-foreground" 
                      : (message.senderId === loggedInUser.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"),
                    message.offerId && "max-w-md bg-transparent p-0"
                  )}
                >
                  {message.offerId ? (
                    <OfferCard offerId={message.offerId} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
                {message.senderId === loggedInUser.id && !message.isSystemMessage && (
                   <Avatar className="h-8 w-8 border">
                    <AvatarImage src={(loggedInUser as User)?.avatar} />
                    <AvatarFallback>
                      {(loggedInUser as User)?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="border-t bg-muted/40 p-4">
          <form
            ref={formRef}
            action={formAction}
            className="relative flex items-center gap-2"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Textarea
              name="message"
              placeholder="Type your message here..."
              className="min-h-12 flex-1 resize-none rounded-full px-4 py-3"
              onKeyDown={handleKeyDown}
            />
             <input type="hidden" name="recipientId" value={recipient.id} />
            <SubmitButton />
          </form>
        </footer>
      </div>
    </div>
  );
}

export function Chat() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ChatContent />
    </Suspense>
  )
}
