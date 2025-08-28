
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product, User } from "@/lib/types";
import { sendInquiryAction } from "@/app/actions";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const inquirySchema = z.object({
  buyerName: z.string().min(1, "Name is required."),
  buyerEmail: z.string().email("A valid email is required."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type ContactSellerDialogProps = {
  product?: Product;
  seller: User;
};

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const form = useForm<z.infer<typeof inquirySchema>>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      buyerName: user?.name || "",
      buyerEmail: user?.email || "",
      message: "",
    },
  });

  // Update form defaults when user data loads
  useState(() => {
    if (user) {
      form.reset({
        buyerName: user.name,
        buyerEmail: user.email,
        message: "",
      });
    }
  });

  const onSubmit = async (values: z.infer<typeof inquirySchema>) => {
    setIsSending(true);
    const result = await sendInquiryAction({
        ...values,
        sellerId: seller.uid,
        productId: product?.id,
        productTitle: product?.title,
    });
    setIsSending(false);

    if (result.success) {
      toast({
        title: "Inquiry Sent!",
        description: "The seller has been notified and will get back to you shortly.",
      });
      setOpen(false);
      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: "Failed to Send Inquiry",
        description: result.error || "An unknown error occurred. Please try again.",
      });
    }
  };

  if (!firebaseUser) {
    return (
        <Button asChild className="w-full">
            <Link href="/login">Log in to Contact Seller</Link>
        </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Contact Seller</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contact {seller.name}</DialogTitle>
          <DialogDescription>
            {product ? `Send an inquiry for "${product.title}".` : "Send a general inquiry to this seller."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buyerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buyerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hi, I'm interested in this product and would like to know more about..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
              <Button type="submit" disabled={isSending} className="w-full">
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Inquiry
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
