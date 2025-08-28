
"use client";

import { useEffect, useState, useActionState } from "react";
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
  message: null,
  error: null,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Send Inquiry
    </Button>
  );
}

export function ContactSellerDialog({ product, seller }: ContactSellerDialogProps) {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const sendInquiryWithContext = async (prevState: any, formData: FormData) => {
    const idToken = await firebaseUser?.getIdToken();
    
    // Server Actions don't send headers in the same way as fetch.
    // The framework handles passing the user's cookie/auth state.
    // For this to work, we must rely on the server-side logic to get the user.
    // I will pass the idToken in the formData for the server to verify.
    if (idToken) {
      formData.append('idToken', idToken);
    }
    
    formData.append('sellerId', seller.uid);
    if (product) {
        formData.append('productTitle', product.title);
    }
    
    // We pass the formData directly, not headers
    return sendInquiryAction(prevState, formData);
  }

  const [state, formAction] = useActionState(sendInquiryWithContext, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Inquiry Sent!",
        description: "The seller has been notified and will get back to you shortly.",
      });
      setOpen(false);
    } else if (state.error) {
      toast({
        variant: "destructive",
        title: "Failed to Send Inquiry",
        description: state.error,
      });
    }
  }, [state, toast]);

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
            {product ? `Send an inquiry for "${product.title}".` : "Send a general inquiry to this seller."}
            Your contact details will not be shared. All communication happens through the platform.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                    id="message"
                    name="message"
                    placeholder="Hi, I'm interested in this product and would like to know more about..."
                    required
                    minLength={10}
                />
                 {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
            </div>
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
