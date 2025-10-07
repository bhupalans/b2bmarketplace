
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionPlan, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createStripePaymentIntent } from '@/services/payments/stripe';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutForm = ({ plan, user, clientSecret }: { plan: SubscriptionPlan, user: User, clientSecret: string }) => {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        
        const { error: submitError } = await elements.submit();
        if (submitError) {
            toast({ variant: 'destructive', title: 'Payment Error', description: submitError.message });
            setIsProcessing(false);
            return;
        }

        const { error } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                // Redirect to a confirmation page. The webhook will handle the subscription update.
                return_url: `${window.location.origin}/profile/subscription/checkout/confirm?status=success`,
            },
        });

        // This point will only be reached if there is an immediate error during payment confirmation.
        if (error) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <Button disabled={isProcessing || !stripe || !elements} className="w-full" type="submit">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Pay ${plan.price.toFixed(2)}
            </Button>
        </form>
    );
};

export function StripeCheckoutForm({ plan, user }: { plan: SubscriptionPlan, user: User }) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchIntent() {
            try {
                const paymentIntentResult = await createStripePaymentIntent({ planId: plan.id, userId: user.uid });
                if (paymentIntentResult.success) {
                    setClientSecret(paymentIntentResult.clientSecret);
                } else {
                    throw new Error(paymentIntentResult.error);
                }
            } catch (err: any) {
                setError(err.message);
                toast({ variant: 'destructive', title: 'Error initializing payment', description: err.message });
            } finally {
                setLoading(false);
            }
        }
        fetchIntent();
    }, [plan.id, user.uid, toast]);

    if (loading) {
        return <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-destructive text-sm font-medium">{error}</div>;
    }

    const appearance = { theme: 'stripe' };
    const options: StripeElementsOptions | undefined = clientSecret ? { clientSecret, appearance } : undefined;

    return (
        <div>
            {options && (
                <Elements options={options} stripe={stripePromise}>
                    <CheckoutForm plan={plan} user={user} clientSecret={clientSecret!} />
                </Elements>
            )}
        </div>
    );
}
