"use client";

import React, { useEffect, useRef, useState } from "react";
import { useActionState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  File,
  ListFilter,
  MoreHorizontal,
  Paperclip,
  PlusCircle,
  Search,
  Send,
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
import { mockMessages, mockUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { sendMessageAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" disabled={pending}>
      <Send className="h-4 w-4" />
      <span className="sr-only">Send</span>
    </Button>
  );
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useActionState(sendMessageAction, {
    error: null,
    message: null,
  });

  useEffect(() => {
    if (state.error) {
      toast({
        variant: "destructive",
        title: "Message failed to send",
        description: state.error,
      });
    }
    if (state.message) {
      setMessages((prev) => [...prev, state.message as Message]);
      formRef.current?.reset();
    }
  }, [state, toast]);

  const activeUser = mockUsers["user-2"];

  return (
    <div className="grid min-h-[calc(100vh-8rem)] w-full grid-cols-[260px_1fr] rounded-lg border">
      <div className="flex flex-col border-r bg-muted/40">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="">Conversations</span>
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">New Conversation</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              href="#"
              className="flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-all"
            >
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={activeUser.avatar} alt={activeUser.name} />
                <AvatarFallback>{activeUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="font-semibold">{activeUser.name}</div>
                <div className="text-xs text-primary-foreground/80">
                  RE: Industrial Grade Widgets
                </div>
              </div>
              <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                1
              </Badge>
            </Link>
          </nav>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-xl">
              {activeUser.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Online
            </p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
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
                  message.senderId === "user-1" && "justify-end"
                )}
              >
                {message.senderId !== "user-1" && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={mockUsers[message.senderId]?.avatar} />
                    <AvatarFallback>
                      {mockUsers[message.senderId]?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs rounded-lg p-3 text-sm",
                    message.senderId === "user-1"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
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
            />
            <SubmitButton />
          </form>
        </footer>
      </div>
    </div>
  );
}
