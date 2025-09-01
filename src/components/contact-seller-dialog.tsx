
"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
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

type ContactSellerDialogProps = {
  product?: Product;
  seller: User;
};

const initialState = {
  success: false,
  error: null,
  conversationId: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? 'Starting Conversation...' : 'Send Inquiry'}
    </Button>
  );
}

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  
  const [state, formAction] = useActionState(sendInquiryAction, initialState);

  useEffect(() => {
    if (firebaseUser) {
      firebaseUser.getIdToken().then(setIdToken);
    }
  }, [firebaseUser]);
  
  useEffect(() => {
    if (state.success && state.conversationId) {
      router.push(`/messages/${state.conversationId}`);
      setOpen(false); // Close dialog on success
    }
    if (!state.success && state.error) {
      toast({
        variant: "destructive",
        title: "Failed to Start Conversation",
        description: state.error,
      });
    }
  }, [state, router, toast]);

  if (!firebaseUser) {
    return (
        <Button asChild className="w-full">
            <Link href="/login">Log in to Contact Seller</Link>
        </Button>
    )
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
              : `Send a general message to ${seller.name}.`
            } Your message will start a new conversation or be added to an existing one.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="sellerId" value={seller.uid} />
            {product && <input type="hidden" name="product" value={JSON.stringify(product)} />}
            {idToken && <input type="hidden" name="idToken" value={idToken} />}
            
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                    id="message"
                    name="message"
                    placeholder="Hi, I'm interested and would like to know more about..."
                    required
                    minLength={10}
                />
            </div>
            <DialogFooter>
               <SubmitButton />
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
