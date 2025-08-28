
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
import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { mockProducts } from "@/lib/mock-data";
import { OfferSuggestion } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

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
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  
  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      productId: "",
      quantity: '',
      pricePerUnit: '',
      notes: "",
    },
  });

  useEffect(() => {
    if (suggestion) {
      form.reset({
        productId: suggestion.productId || "",
        quantity: suggestion.quantity || '',
        pricePerUnit: suggestion.pricePerUnit || '',
        notes: "",
      });
    }
  }, [suggestion, form, open]);
  
  const handleAction = async (values: z.infer<typeof offerSchema>) => {
    setIsSending(true);

    const offerValues = {
        productId: values.productId,
        quantity: values.quantity,
        pricePerUnit: values.pricePerUnit,
        notes: values.notes,
    }
    const formData = new FormData();
    formData.append('offer', JSON.stringify(offerValues));
    formData.append('recipientId', recipientId);
    // The message here is a placeholder because the action expects it,
    // but the actual visible message is created on the server based on the offer.
    formData.append('message', `New Offer for ${values.productId}`);

    await formAction(formData);

    const product = mockProducts.find(p => p.id === offerValues.productId);
    toast({
        title: "Offer Sent!",
        description: `Your offer for ${product?.title} has been sent.`
    });
    
    setIsSending(false);
    handleOpenChange(false);
  }

  const sellerProducts = mockProducts.filter(p => p.sellerId === user?.id);
  
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
        quantity: '',
        pricePerUnit: '',
        notes: "",
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!open && (
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
                      <Input type="number" {...field} />
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
                      <Input type="number" step="0.01" {...field} />
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
