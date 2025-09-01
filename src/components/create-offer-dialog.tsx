
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Gavel, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { OfferSuggestion, Product } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { getSellerProductsClient } from "@/lib/firebase";
import { createOfferAction } from "@/app/actions";

const offerSchema = z.object({
  productId: z.string().min(1, { message: "Please select a product." }),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive." }),
  pricePerUnit: z.coerce.number().positive({ message: "Price must be positive." }),
  notes: z.string().optional(),
});

type CreateOfferDialogProps = {
  suggestion?: OfferSuggestion | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  recipientId: string;
  conversationId: string;
};


export function CreateOfferDialog({ suggestion, open, onOpenChange, onClose, recipientId, conversationId }: CreateOfferDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSending, startTransition] = useTransition();
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  
  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      productId: "",
      quantity: undefined,
      pricePerUnit: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (user) {
        getSellerProductsClient(user.uid).then(setSellerProducts);
    }
  }, [user]);

  useEffect(() => {
    if (suggestion && open) {
      const product = sellerProducts.find(p => p.id === suggestion.productId);
      form.reset({
        productId: suggestion.productId || "",
        quantity: suggestion.quantity || undefined,
        pricePerUnit: suggestion.pricePerUnit || product?.priceUSD || undefined,
        notes: "",
      });
    }
  }, [suggestion, open, form, sellerProducts]);
  
  const handleAction = async (values: z.infer<typeof offerSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to send an offer." });
      return;
    }
    
    const offerData = {
        ...values,
        conversationId,
        buyerId: recipientId,
        sellerId: user.uid,
    }

    startTransition(async () => {
        const result = await createOfferAction(offerData);

        if (result.success) {
            toast({
                title: "Offer Sent",
                description: "Your formal offer has been sent to the buyer.",
            });
            handleOpenChange(false);
        } else {
             toast({
                variant: "destructive",
                title: "Failed to Send Offer",
                description: result.error || "An unknown error occurred.",
            });
        }
    });
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
    if (!isOpen && onClose) {
      onClose();
    }
    if (!isOpen) {
      form.reset({
        productId: "",
        quantity: undefined,
        pricePerUnit: undefined,
        notes: "",
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Formal Offer</DialogTitle>
          <DialogDescription>
            Fill out the details below to send a formal offer to the buyer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleAction)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    name={field.name}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sellerProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Bulk discount applied, delivery terms..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSending}>
                    {isSending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Offer
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
