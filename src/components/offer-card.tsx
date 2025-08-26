
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
import { useFormStatus } from "react-dom";

interface OfferCardProps {
  offerId: string;
  onDecision?: (payload: FormData) => void;
}

const ActionButton = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full"
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
  const showActions = isBuyer && offer.status === "pending" && onDecision;

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
          <div className="w-full space-y-2">
             <form action={onDecision} className="w-full">
               <input
                 type="hidden"
                 name="offerDecision"
                 value={JSON.stringify({
                   offerId,
                   decision: 'accepted',
                   productTitle: product.title,
                 })}
               />
              <input type="hidden" name="message" value="Offer decision made" />
               <ActionButton>
                 <Check className="mr-2" /> Accept Offer
               </ActionButton>
             </form>
             <form action={onDecision} className="w-full">
                <input
                    type="hidden"
                    name="offerDecision"
                    value={JSON.stringify({
                      offerId,
                      decision: 'declined',
                      productTitle: product.title,
                    })}
                />
                <input type="hidden" name="message" value="Offer decision made" />
                <Button type="submit" variant="outline" className="w-full">
                  <X className="mr-2" /> Decline
                </Button>
             </form>
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
