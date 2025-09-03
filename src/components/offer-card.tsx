
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Offer } from "@/lib/types";
import { getOfferClient, updateOfferStatusClient } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Gavel, Check, X, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { revalidateOffers } from "@/app/actions";

interface OfferCardProps {
  offerId: string;
  currentUserId: string;
}

export function OfferCard({ offerId, currentUserId }: OfferCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();

  useEffect(() => {
    // This listener will re-fetch the offer whenever the offerId changes.
    // It's simple, but for a real-time app, we'd use an onSnapshot listener here.
    const fetchOffer = async () => {
        setLoading(true);
        const data = await getOfferClient(offerId);
        setOffer(data);
        setLoading(false);
    }
    fetchOffer();
  }, [offerId]);

  const handleStatusUpdate = (status: 'accepted' | 'declined') => {
    if (!user) return;
    startTransition(async () => {
        try {
            await updateOfferStatusClient(offerId, status, user.uid);
            toast({
                title: `Offer ${status}`,
                description: `You have successfully ${status} the offer.`,
            });
            // Re-fetch the offer to get the latest status
            const updatedOffer = await getOfferClient(offerId);
            setOffer(updatedOffer);
            await revalidateOffers(); // Revalidate path for server components if needed
        } catch (error: any) {
            console.error(`Error ${status} offer:`, error);
            toast({
                variant: 'destructive',
                title: 'Action Failed',
                description: error.message || 'An unknown error occurred.',
            })
        }
    });
  }

  if (loading) {
    return (
        <div className="flex justify-center my-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-md" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-2/3" />
                        </div>
                    </div>
                     <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter>
                     <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (!offer) {
    return (
        <div className="flex justify-center my-4">
            <p className="text-sm text-destructive">Could not load offer details.</p>
        </div>
    );
  }

  const isBuyer = currentUserId === offer.buyerId;
  const totalPrice = (offer.quantity * offer.pricePerUnit).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const unitPrice = offer.pricePerUnit.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  
  const createdAtDate = offer.createdAt instanceof Date 
    ? offer.createdAt 
    : offer.createdAt && typeof offer.createdAt === 'string'
    ? new Date(offer.createdAt)
    : new Date();


  return (
    <div className="flex justify-center my-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gavel className="h-5 w-5 text-primary" />
              Formal Offer
            </CardTitle>
            <Badge variant={offer.status === 'pending' ? 'secondary' : offer.status === 'accepted' ? 'default' : 'destructive'} className="capitalize">{offer.status}</Badge>
          </div>
          <CardDescription>
            Sent on {format(createdAtDate, 'PPP')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
                <Image src={offer.productImage} alt={offer.productTitle} width={64} height={64} className="rounded-md border object-cover aspect-square" />
                <div className="flex-1">
                    <p className="font-semibold">{offer.productTitle}</p>
                    <p className="text-sm text-muted-foreground">{offer.quantity.toLocaleString()} units @ {unitPrice} / unit</p>
                    <p className="text-lg font-bold mt-1">{totalPrice} total</p>
                </div>
            </div>

          {offer.notes && (
            <blockquote className="border-l-2 pl-4 italic text-sm text-muted-foreground">
              "{offer.notes}"
            </blockquote>
          )}
        </CardContent>
        {offer.status === 'pending' && isBuyer && (
            <CardFooter className="flex flex-col gap-2">
                <div className="flex w-full gap-2">
                    <Button 
                        variant="destructive" 
                        className="w-full"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate('declined')}
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} 
                        Decline
                    </Button>
                    <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate('accepted')}
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Accept
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
