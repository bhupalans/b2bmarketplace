
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

const CheckoutForm = ({ plan, user }: { plan: SubscriptionPlan, user: User }) => {
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

        const clientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        );
        
        if (!clientSecret) {
             toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not find payment details. Please try again.' });
             setIsProcessing(false);
             return;
        }

        // Use confirmPayment instead of confirmSetup
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                // Return URL is not strictly needed here since we redirect manually on success,
                // but it's good practice for other payment methods.
                return_url: `${window.location.origin}/profile/subscription/checkout/confirm`,
            },
            // We handle the redirect manually, so Stripe will only redirect if required for authentication (e.g., 3D Secure)
            redirect: 'if_required', 
        });

        if (error) {
            // This point will only be reached if there is an immediate error during payment confirmation.
            toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
            setIsProcessing(false);
        } else if (paymentIntent?.status === 'succeeded') {
            // The payment was successful. Manually redirect to the confirmation page.
            toast({ title: 'Payment Successful', description: 'Redirecting to confirmation...' });
            router.push(`/profile/subscription/checkout/confirm?status=success&planId=${plan.id}&payment_intent=${paymentIntent.id}`);
        } else if (paymentIntent) {
            // In other cases, like 'requires_action', Stripe.js has already handled the redirect.
            // This block is for handling unexpected statuses.
            toast({ variant: 'destructive', title: 'Payment Incomplete', description: `Payment status: ${paymentIntent.status}. Please try again.` });
            setIsProcessing(false);
        } else {
             // Fallback if paymentIntent is somehow undefined
             toast({ variant: 'destructive', title: 'Payment Error', description: 'An unknown error occurred. Please try again.'});
             setIsProcessing(false);
        }
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

    const appearance = { theme: 'stripe' as const };
    const options: StripeElementsOptions | undefined = clientSecret ? { clientSecret, appearance } : undefined;

    return (
        <div>
            {options && (
                <Elements options={options} stripe={stripePromise}>
                    <CheckoutForm plan={plan} user={user} />
                </Elements>
            )}
        </div>
    );
}
