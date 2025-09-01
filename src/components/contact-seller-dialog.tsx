
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
import type { Product, User } from "@/lib/types";
import { findOrCreateConversation, sendMessage } from "@/lib/firebase";
import { Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";

type ContactSellerDialogProps = {
  product?: Product;
  seller: User;
};

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

    const staticMessage = `I'm interested in learning more about "${product.title}".`;

    startTransition(async () => {
      try {
        const { conversationId } = await findOrCreateConversation({
          buyerId: firebaseUser.uid,
          sellerId: seller.uid,
          productId: product.id,
          productTitle: product.title,
          productImage: product.images[0] || '',
        });

        await sendMessage(conversationId, firebaseUser.uid, staticMessage);

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

  if (authLoading) {
    return (
      <Button disabled className="w-full">
         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
         Loading...
      </Button>
    )
  }

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
        <Button className="w-full">
            <MessageSquare className="mr-2 h-4 w-4" />
            Contact Seller
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>
            A new conversation with {seller.name} will be started regarding the product: "{product?.title}".
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <form onSubmit={handleSubmit} className="w-full">
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? 'Starting...' : 'Confirm and Start Conversation'}
                </Button>
            </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
