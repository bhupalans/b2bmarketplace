
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
import { Check, Gavel, X } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";

interface OfferCardProps {
  offerId: string;
}

export function OfferCard({ offerId }: OfferCardProps) {
  const { toast } = useToast();
  const offer = mockOffers[offerId];
  if (!offer) return null;

  const product = mockProducts.find((p) => p.id === offer.productId);
  if (!product) return null;

  const handleDecision = (decision: "accepted" | "declined") => {
    // In a real app, this would be a server action.
    offer.status = decision;
    toast({
      title: `Offer ${decision}`,
      description: `You have ${decision} the offer for ${product.title}.`,
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
              src={product.image}
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
        {offer.status === "pending" ? (
          <>
            <Button onClick={() => handleDecision("accepted")}>
              <Check className="mr-2" />
              Accept Offer
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDecision("declined")}
            >
              <X className="mr-2" />
              Decline
            </Button>
          </>
        ) : (
          <Badge
            className="w-full justify-center py-2 text-sm"
            variant={offer.status === 'accepted' ? 'default' : 'destructive'}
          >
            Offer {offer.status}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
