
"use client";

import { loggedInUser, mockOffers, mockProducts } from "@/lib/mock-data";
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
import { useState } from "react";
import { Offer } from "@/lib/types";
import { useFormStatus } from "react-dom";

interface OfferCardProps {
  offerId: string;
  onDecision?: (payload: FormData) => void;
}

const ActionButton = ({
  decision,
  children,
}: {
  decision: "accepted" | "declined";
  children: React.ReactNode;
}) => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      disabled={pending}
      variant={decision === "declined" ? "outline" : "default"}
    >
      {pending ? <Loader2 className="mr-2 animate-spin" /> : children}
    </Button>
  );
};

export function OfferCard({ offerId, onDecision }: OfferCardProps) {
  const { toast } = useToast();
  // We use state to make the component re-render when the offer status changes.
  const offer = mockOffers[offerId];

  if (!offer) return null;

  const product = mockProducts.find((p) => p.id === offer.productId);
  if (!product) return null;

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

  const handleDecision = (formData: FormData) => {
    const decision = formData.get("decision") as "accepted" | "declined";

    // Optimistically update the mock data for the demo
    const updatedOffer = { ...offer, status: decision };
    mockOffers[offerId] = updatedOffer;

    if (onDecision) {
      const offerDecision = {
        offerId,
        decision,
        productTitle: product.title,
      };
      formData.append("offerDecision", JSON.stringify(offerDecision));
      formData.append("message", "Offer decision made");
      onDecision(formData);
    } else {
      toast({
        title: `Offer ${decision}`,
        description: `You have ${decision} the offer for ${product.title}.`,
      });
    }
  };

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
          <form action={handleDecision} className="w-full space-y-2">
            <ActionButton decision="accepted">
              <Check className="mr-2" /> Accept Offer
            </ActionButton>
            <ActionButton decision="declined">
              <X className="mr-2" /> Decline
            </ActionButton>
          </form>
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
