
"use client";

import { mockOffers, mockProducts } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Check, Gavel, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { decideOnOfferAction } from "@/app/actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";


interface OfferCardProps {
  offerId: string;
}

export function OfferCard({ offerId }: OfferCardProps) {
  const { toast } = useToast();
  const { user: loggedInUser } = useAuth();
  const offer = mockOffers[offerId];
  const [isPending, startTransition] = useTransition();
  const router = useRouter();


  if (!offer || !loggedInUser) return null;

  const product = mockProducts.find((p) => p.id === offer.productId);
  if (!product) return null;

  const handleDecision = async (decision: 'accepted' | 'declined') => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('offerId', offerId);
      formData.append('decision', decision);

      const result = await decideOnOfferAction(formData);

      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Offer ${decision}`,
          description: `You have ${decision} the offer for ${product.title}.`,
        });
        // In a real app, a websocket would push this update.
        // For our demo, we just refresh the page to show the new system message.
        router.refresh();
      }
    });
  };

  const totalPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(offer.quantity * offer.pricePerUnit);

  const pricePerUnit = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(offer.pricePerUnit);

  const isBuyer = loggedInUser.id === offer.buyerId;
  const showActions = isBuyer && offer.status === "pending";

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="flex items-center gap-2">
              <Gavel className="h-4 w-4" /> Formal Offer
            </CardDescription>
            <CardTitle>{product.title}</CardTitle>
          </div>
          <div className="relative h-16 w-16 overflow-hidden rounded-md">
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              data-ai-hint="product image"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-muted-foreground">Quantity</p>
            <p className="font-medium">{offer.quantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Price/Unit</p>
            <p className="font-medium">{pricePerUnit}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Total Price</p>
          <p className="text-2xl font-bold text-primary">{totalPrice}</p>
        </div>
        {offer.notes && (
          <div>
            <p className="text-muted-foreground">Notes</p>
            <p className="italic">"{offer.notes}"</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        {showActions ? (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              onClick={() => handleDecision('declined')}
              variant="outline"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 animate-spin" /> : <X className="mr-2" />}
              Decline
            </Button>
            <Button onClick={() => handleDecision('accepted')} disabled={isPending}>
               {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
               Accept
            </Button>
          </div>
        ) : (
          <Badge
            className="w-full justify-center py-2 text-sm capitalize"
            variant={
              offer.status === "pending"
                ? "secondary"
                : offer.status === "accepted"
                ? "default"
                : "destructive"
            }
          >
            {offer.status === "pending"
              ? isBuyer
                ? "Pending Your Response"
                : "Offer Sent"
              : `Offer ${offer.status}`}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
