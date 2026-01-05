
'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { answerQuestion } from '@/ai/flows/support-chatbot-flow';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/contexts/auth-context';

type ChatMessage = {
  sender: 'user' | 'bot';
  text: string;
};

export function SupportChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    // Add a welcome message when the chat opens for the first time
    if (isOpen && messages.length === 0) {
      setMessages([
        { sender: 'bot', text: "Hello! I'm the support assistant. How can I help you today?" }
      ]);
    }
  }, [isOpen, messages.length]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    startTransition(async () => {
      try {
        const result = await answerQuestion({ question: input });
        const botMessage: ChatMessage = { sender: 'bot', text: result.answer };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error("Chatbot Error:", error);
        const errorMessage: ChatMessage = { sender: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later." };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  return (
    <>
      <div className={cn("fixed bottom-6 right-6 z-50 transition-transform duration-300", isOpen && "translate-x-[500px]")}>
        <Button size="icon" className="rounded-full w-14 h-14 shadow-lg" onClick={() => setIsOpen(true)}>
          <MessageSquare className="h-6 w-6" />
          <span className="sr-only">Open support chat</span>
        </Button>
      </div>

      <div className={cn(
        "fixed bottom-6 right-6 z-50 w-full max-w-sm transition-all duration-300",
        isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none"
      )}>
        <Card className="h-[70vh] flex flex-col shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg">Support Assistant</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close chat</span>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={cn("flex items-end gap-2", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                {msg.sender === 'bot' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  msg.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {msg.text}
                </div>
                {msg.sender === 'user' && user && (
                    <Avatar className="h-8 w-8 border">
                        {user.avatar ? <img src={user.avatar} alt={user.name}/> : <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>}
                    </Avatar>
                )}
              </div>
            ))}
            {isPending && (
                 <div className="flex items-end gap-2 justify-start">
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">AI</AvatarFallback>
                    </Avatar>
                    <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <Input 
                placeholder="Ask a question..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="icon" disabled={isPending || !input.trim()}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
