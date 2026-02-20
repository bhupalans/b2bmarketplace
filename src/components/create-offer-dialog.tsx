
"use client";

import { useState, useTransition } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Conversation, User } from "@/lib/types";
import { createOffer } from "@/lib/firebase";
import { Loader2, Gavel } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useCurrency } from "@/contexts/currency-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const offerSchema = z.object({
    quantity: z.coerce.number().min(1, 'Please enter a valid quantity.'),
    price: z.object({
        baseAmount: z.coerce.number().min(0.01, 'Please enter a valid price.'),
        baseCurrency: z.string().min(3).max(3),
    }),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional(),
});

type OfferFormData = z.infer<typeof offerSchema>;

type CreateOfferDialogProps = {
  conversation: Conversation;
  buyer: User;
};

export function CreateOfferDialog({ conversation, buyer }: CreateOfferDialogProps) {
  const { user: seller, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { currency: sellerCurrency, rates } = useCurrency();
  const availableCurrencies = Array.from(new Set(["USD", ...Object.keys(rates)]));

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      quantity: 1,
      price: { baseAmount: undefined, baseCurrency: sellerCurrency },
      notes: "",
    }
  });

  const onSubmit = (values: OfferFormData) => {
    if (!seller) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in as a seller." });
      return;
    }

    startTransition(async () => {
      try {
        await createOffer({
          ...values,
          productId: conversation.productId,
          conversationId: conversation.id,
          buyerId: buyer.uid,
          sellerId: seller.uid,
        });

        toast({
          title: "Offer Sent",
          description: "Your formal offer has been sent to the buyer.",
        });
        setOpen(false);
        form.reset();
      } catch (error: any) {
        console.error("Error creating offer:", error);
        toast({
          variant: "destructive",
          title: "Failed to Send Offer",
          description: error.message || "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            form.reset({
                quantity: 1,
                price: { baseAmount: undefined, baseCurrency: sellerCurrency },
                notes: "",
            });
        }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Gavel className="mr-2 h-4 w-4" />
            Create Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Formal Offer</DialogTitle>
          <DialogDescription>
            Send a formal, binding offer to {buyer.name} for the product: {conversation.productTitle}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 1000" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <FormField
                            control={form.control}
                            name="price.baseAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price per Unit</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="e.g., 9.50" {...field} value={field.value ?? ''}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="price.baseCurrency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {availableCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Include any terms, conditions, or a personal message..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Offer
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
