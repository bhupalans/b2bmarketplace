
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { OfferSuggestion, Product } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { sendMessageAction } from "@/app/actions";
import { getSellerProducts } from "@/lib/firestore";

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
};


export function CreateOfferDialog({ suggestion, open, onOpenChange, onClose, recipientId }: CreateOfferDialogProps) {
  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
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
    if (firebaseUser) {
        getSellerProducts(firebaseUser.uid).then(setSellerProducts);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (suggestion) {
      const product = sellerProducts.find(p => p.id === suggestion.productId);
      form.reset({
        productId: suggestion.productId || "",
        quantity: suggestion.quantity || undefined,
        pricePerUnit: suggestion.pricePerUnit || product?.priceUSD || undefined,
        notes: "",
      });
    }
  }, [suggestion, form, open, sellerProducts]);
  
  const handleAction = async (values: z.infer<typeof offerSchema>) => {
    if (!firebaseUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to send an offer." });
      return;
    }
    setIsSending(true);

    const offerValues = {
        productId: values.productId,
        quantity: values.quantity,
        pricePerUnit: values.pricePerUnit,
        notes: values.notes,
    }
    
    const result = await sendMessageAction({
        message: `New Offer for ${values.productId}`,
        recipientUid: recipientId,
        senderUid: firebaseUser.uid,
        offer: JSON.stringify(offerValues),
    });

    if (result.error) {
        toast({
            variant: "destructive",
            title: "Offer failed to send",
            description: result.error,
        });
    } else {
        const product = sellerProducts.find(p => p.id === offerValues.productId);
        toast({
            title: "Offer Sent!",
            description: `Your offer for ${product?.title} has been sent.`
        });
        handleOpenChange(false);
    }
    
    setIsSending(false);
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
      {!open && !suggestion && (
        <DialogTrigger asChild>
          <Button>
            <Gavel className="mr-2 h-4 w-4" />
            Create Offer
          </Button>
        </DialogTrigger>
      )}
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
