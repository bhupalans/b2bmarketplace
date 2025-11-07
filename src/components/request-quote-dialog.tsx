
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Product, User } from "@/lib/types";
import { findOrCreateConversation, sendMessage } from "@/lib/firebase";
import { Loader2, FileText, Gem } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const quoteSchema = z.object({
    quantity: z.coerce.number().min(1, 'Please enter a valid quantity.'),
    requirements: z.string().min(10, 'Please describe your requirements (min. 10 characters).').max(500, 'Message cannot exceed 500 characters.'),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

type RequestQuoteDialogProps = {
  product: Product;
  seller: User;
};

export function RequestQuoteDialog({ product, seller }: RequestQuoteDialogProps) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
        quantity: product.moq || 1,
        requirements: "",
    }
  });

  const onSubmit = (values: QuoteFormData) => {
    if (!firebaseUser || !user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    
    if (user.role !== 'buyer') {
      toast({ variant: "destructive", title: "Action Not Allowed", description: "Only buyers can request a quote." });
      return;
    }

    startTransition(async () => {
      try {
        const { conversationId } = await findOrCreateConversation({
            buyerId: user.uid,
            sellerId: seller.uid,
            productId: product.id,
            productTitle: product.title,
            productImage: product.images[0] || '',
        });
        
        const formattedMessage = `<b>New Quote Request</b><br/><b>Product:</b> ${product.title}<br/><b>Quantity:</b> ${values.quantity}<br/><br/><b>Buyer's Message:</b><br/>${values.requirements}`;
        await sendMessage(conversationId, user.uid, formattedMessage, { isQuoteRequest: true });

        toast({
          title: "Quote Request Sent",
          description: "Your request has been sent to the seller.",
        });
        router.push(`/messages/${conversationId}`);
        setOpen(false);
      } catch (error: any) {
        console.error("Error sending quote request:", error);
        toast({
          variant: "destructive",
          title: "Failed to Send Request",
          description: error.message || "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  if (authLoading) {
    return (
      <Button disabled className="w-full">
         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
         Loading...
      </Button>
    )
  }

  if (firebaseUser?.uid === seller.uid) {
    return null; // Don't show button if the user is the seller
  }

  if (!firebaseUser || user?.role !== 'buyer') {
    return (
      <Button asChild className="w-full">
        <Link href="/login">Log in as Buyer to Request Quote</Link>
      </Button>
    );
  }
  
  const hasActiveSubscription = user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > new Date();
  
  if (!hasActiveSubscription) {
      return (
          <Button asChild className="w-full" variant="secondary">
              <Link href="/profile/subscription">
                  <Gem className="mr-2 h-4 w-4" />
                  Upgrade to Request a Quote
              </Link>
          </Button>
      )
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            Request a Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a Quote for: {product.title}</DialogTitle>
          <DialogDescription>
            Submit your requirements to {seller.name} to get a customized quote for your business needs.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity Needed (Min: {product.moq} {product.moqUnit})</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder={`e.g. ${product.moq}`} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="requirements"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Requirements</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe your specific needs, e.g., delivery timeline, packaging requirements, etc." {...field} />
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
                        Send Request
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
