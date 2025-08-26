
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
import { loggedInUser, mockProducts } from "@/lib/mock-data";
import { OfferSuggestion } from "@/lib/types";

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
  formAction: (payload: FormData) => void;
};


export function CreateOfferDialog({ suggestion, open, onOpenChange, onClose, recipientId, formAction }: CreateOfferDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isControllingOpen = typeof open !== 'undefined';

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
    if (suggestion) {
      form.reset({
        productId: suggestion.productId || "",
        quantity: suggestion.quantity,
        pricePerUnit: suggestion.pricePerUnit,
        notes: "",
      });
    }
  }, [suggestion, form, open]);

  async function onSubmit(values: z.infer<typeof offerSchema>) {
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append("message", "New Offer");
    formData.append("offer", JSON.stringify(values));
    formData.append("recipientId", recipientId);

    // This action will create the offer and the message.
    // The chat component will receive the new message and update the UI.
    formAction(formData);
    
    const product = mockProducts.find(p => p.id === values.productId);
    toast({
        title: "Offer Sent!",
        description: `Your offer for ${product?.title} has been sent.`
    });
    
    setIsLoading(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
    if (onClose) {
      onClose();
    }
    form.reset();
  }

  const sellerProducts = mockProducts.filter(p => p.sellerId === loggedInUser.id);
  
  const handleOpenChange = (isOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
    if (!isOpen && onClose) {
      onClose();
    }
    if (!isOpen) {
      form.reset();
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControllingOpen && (
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
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
                      <Input type="number" {...field} disabled={isLoading} />
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
                      <Input type="number" step="0.01" {...field} disabled={isLoading} />
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
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
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
