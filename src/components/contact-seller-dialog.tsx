
"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product, User } from "@/lib/types";
import { findOrCreateConversation, sendMessage } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type ContactSellerDialogProps = {
  product?: Product;
  seller: User;
};

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !product) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to send a message.",
      });
      return;
    }

    if (message.trim().length < 10) {
        toast({
            variant: "destructive",
            title: "Message too short",
            description: "Please enter a message of at least 10 characters.",
        });
        return;
    }

    startTransition(async () => {
      try {
        const { conversationId } = await findOrCreateConversation({
          buyerId: firebaseUser.uid,
          sellerId: seller.uid,
          productId: product.id,
          productTitle: product.title,
          productImage: product.images[0] || '',
        });

        await sendMessage(conversationId, firebaseUser.uid, message);

        toast({
          title: "Conversation Started",
          description: "Your message has been sent successfully.",
        });
        router.push(`/messages/${conversationId}`);
        setOpen(false);
      } catch (error: any) {
        console.error("Error sending inquiry:", error);
        toast({
          variant: "destructive",
          title: "Failed to Start Conversation",
          description: error.message || "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  if (!firebaseUser) {
    return (
      <Button asChild className="w-full">
        <Link href="/login">Log in to Contact Seller</Link>
      </Button>
    );
  }

  if (firebaseUser.uid === seller.uid) {
    return null;
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
            {product
              ? `Send an inquiry for "${product.title}".`
              : `Send a general message to ${seller.name}.`}
            Your message will start a new conversation or be added to an existing one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="message">Your Message</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Hi, I'm interested and would like to know more about..."
              required
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Starting Conversation...' : 'Send Inquiry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
