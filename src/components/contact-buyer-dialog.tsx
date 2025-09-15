
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
import { SourcingRequest, User } from "@/lib/types";
import { sendQuoteForSourcingRequest } from "@/lib/firebase";
import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Textarea } from "./ui/textarea";

const quoteSchema = z.object({
    message: z.string().min(10, 'Please describe your offer (min. 10 characters).').max(1000, 'Message cannot exceed 1000 characters.'),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface ContactBuyerDialogProps {
  request: SourcingRequest;
  buyer: User;
};

export function ContactBuyerDialog({ request, buyer }: ContactBuyerDialogProps) {
  const { user: seller, firebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
        message: "",
    }
  });

  const onSubmit = (values: QuoteFormData) => {
    if (!firebaseUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }

    startTransition(async () => {
      try {
        const conversationId = await sendQuoteForSourcingRequest({
          sellerId: firebaseUser.uid,
          buyerId: buyer.uid,
          sourcingRequestId: request.id,
          sourcingRequestTitle: request.title,
          message: values.message,
        });

        toast({
          title: "Quote Sent",
          description: "Your message has been sent to the buyer.",
        });
        router.push(`/messages/${conversationId}`);
        setOpen(false);
      } catch (error: any) {
        console.error("Error sending sourcing request quote:", error);
        toast({
          variant: "destructive",
          title: "Failed to Send Quote",
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
  
  // If the user is not a seller, they shouldn't see this button
  if (seller?.role !== 'seller') {
      return null;
  }

  // If the user is the one who posted the request, they can't contact themselves
  if (firebaseUser?.uid === buyer.uid) {
    return null;
  }
  
  if (!firebaseUser) {
    return (
        <Button asChild className="w-full">
            <Link href="/login">Log in to Contact Buyer</Link>
        </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
            Contact Buyer & Submit Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact Buyer for: {request.title}</DialogTitle>
          <DialogDescription>
            Submit your offer or message to {buyer.name}. This will start a new conversation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Message / Offer</FormLabel>
                            <FormControl>
                                <Textarea rows={5} placeholder="Describe your product, price, and terms. For example: 'We can supply this item at $X per unit...'" {...field} />
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
                        Send Message
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
