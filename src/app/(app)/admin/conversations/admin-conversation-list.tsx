
"use client";

import React, { useState, useTransition } from "react";
import { Conversation, User } from "@/lib/types";
import { MessageSquare, Users, Search, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { downloadConversationAction } from "@/app/admin-actions";
import { useToast } from "@/hooks/use-toast";

type PopulatedConversation = Conversation & { participants: User[] };

interface AdminConversationListProps {
    conversations: PopulatedConversation[];
}

export function AdminConversationList({ conversations }: AdminConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const filteredConversations = conversations.filter(c => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const matchesParticipant = c.participants.some(p => p.name.toLowerCase().includes(lowerSearchTerm));
    const matchesProduct = c.productTitle?.toLowerCase().includes(lowerSearchTerm);
    return matchesParticipant || matchesProduct;
  });
  
  const handleDownload = (conversationId: string, productTitle: string) => {
    setDownloadingId(conversationId);
    startTransition(async () => {
        const result = await downloadConversationAction(conversationId);
        if (result.success && result.csvContent) {
            const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeTitle = productTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute("href", url);
            link.setAttribute("download", `conversation_${safeTitle}_${conversationId.substring(0,5)}.csv`);
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

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Message Monitoring</h1>
            <p className="text-muted-foreground">Review and download conversations between buyers and sellers.</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>All Conversations</CardTitle>
                <CardDescription>
                    {conversations.length} conversation(s) found.
                </CardDescription>
                <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by user or product..." 
                        className="pl-8 w-full md:w-1/3"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Participants</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Last Message</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => {
                            const participantNames = conv.participants.map(p => p.name).join(' & ');
                            return (
                                <TableRow key={conv.id}>
                                    <TableCell className="font-medium">{participantNames}</TableCell>
                                    <TableCell>
                                        <Link href={`/products/${conv.productId}`} className="hover:underline">
                                            {conv.productTitle}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-xs">{conv.lastMessage?.text}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {conv.lastMessage?.timestamp ? format(conv.lastMessage.timestamp.toDate(), 'PP') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(conv.id, conv.productTitle)}
                                            disabled={isPending && downloadingId === conv.id}
                                        >
                                            {isPending && downloadingId === conv.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="mr-2 h-4 w-4" />
                                            )}
                                            Download
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No conversations found.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
