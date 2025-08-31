
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
import { sendInquiryAction } from "@/app/actions";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { findOrCreateConversation } from "@/lib/firebase";

type ContactSellerDialogProps = {
  product: Product; // Product is now mandatory
  seller: User;
};

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseUser || !user) {
        toast({ variant: "destructive", title: "Authentication Error" });
        return;
    }

    startTransition(async () => {
        try {
            const { conversationId, isNew } = await findOrCreateConversation({
                buyerId: user.uid,
                sellerId: seller.uid,
                productId: product.id,
                productTitle: product.title,
                productImage: product.images[0] || "",
            });

            if (isNew) {
                // If it's a new conversation, send the first message via a Server Action
                const formData = new FormData();
                formData.append('idToken', (await firebaseUser.getIdToken()) || "");
                formData.append('sellerId', seller.uid);
                formData.append('product', JSON.stringify(product));
                formData.append('message', message);
                
                const result = await sendInquiryAction({}, formData);

                if (!result.success) {
                    throw new Error(result.error || "Failed to start conversation.");
                }
            }
            
            router.push(`/messages/${conversationId}`);
            
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Failed to Start Conversation",
                description: error.message,
            });
        }
    });
  };

  if (!firebaseUser) {
    return (
        <Button asChild className="w-full">
            <Link href="/login">Log in to Contact Seller</Link>
        </Button>
    )
  }
  
  if (firebaseUser.uid === seller.uid) {
    return (
      <Button className="w-full" disabled>This is your product</Button>
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
            Send an inquiry for "{product.title}".
            Your contact details will not be shared. All communication happens through the platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                    id="message"
                    name="message"
                    placeholder="Hi, I'm interested in this product and would like to know more about..."
                    required
                    minLength={10}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </div>
            <DialogFooter>
               <Button type="submit" disabled={isPending || message.length < 10} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Starting Conversation...' : 'Send Inquiry'}
               </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
