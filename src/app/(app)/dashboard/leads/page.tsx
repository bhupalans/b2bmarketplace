
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getLeadsForSeller } from '@/lib/firebase';
import { Lead } from '@/lib/types';
import { Loader2, Inbox, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

const LeadItem = ({ lead }: { lead: Lead }) => (
    <div className="border-b p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <Avatar className="h-10 w-10">
            <AvatarImage src={lead.buyerAvatar} alt={lead.buyerName} />
            <AvatarFallback>{lead.buyerName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1 overflow-hidden">
            <p className="font-semibold truncate">{lead.buyerName}</p>
            <p className="text-sm text-muted-foreground truncate">Interested in: {lead.productTitle}</p>
            <p className="text-sm text-muted-foreground truncate">Requested Quantity: {lead.quantity}</p>
             <p className="text-sm text-muted-foreground line-clamp-2">Message: {lead.requirements}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lead.createdAt as string), { addSuffix: true })}</span>
            <Button size="sm" asChild>
                <Link href="/profile/subscription">
                    Upgrade to Reply
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
    </div>
);

export default function LeadsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        
        // Redirect if user is not a free seller
        const isFreeSeller = user?.role === 'seller' && (!user.subscriptionPlanId || user.subscriptionPlan?.price === 0);
        if (!isFreeSeller) {
            router.replace('/dashboard');
            return;
        }

        if (user) {
            getLeadsForSeller(user.uid)
                .then(setLeads)
                .catch(err => console.error("Failed to fetch leads:", err))
                .finally(() => setLoading(false));
        }

    }, [user, authLoading, router]);

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Leads</h1>
                <p className="text-muted-foreground">
                    These are inquiries from potential buyers. Upgrade your plan to start a conversation.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Incoming Leads</CardTitle>
                    <CardDescription>
                        You have {leads.length} new lead(s).
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                     {leads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <Inbox className="h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 font-semibold">No leads yet</p>
                            <p className="text-sm text-muted-foreground">When a buyer requests a quote, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {leads.map(lead => <LeadItem key={lead.id} lead={lead} />)}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
