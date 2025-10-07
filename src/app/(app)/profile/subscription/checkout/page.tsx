"use client";

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { getActivePaymentGatewaysClient, getSubscriptionPlansClient } from '@/lib/firebase';
import { SubscriptionPlan, PaymentGateway, User } from '@/lib/types';
import { CreditCard, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createStripePaymentIntent } from '@/services/payments/stripe';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);


const CheckoutForm = ({ plan, user }: { plan: SubscriptionPlan, user: User }) => {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsProcessing(true);

        const baseUrl = window.location.origin;
        const confirmUrl = `${baseUrl}/profile/subscription/checkout/confirm?planId=${plan.id}`;

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: confirmUrl,
            },
        });

        if (error.type === "card_error" || error.type === "validation_error") {
            toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
        } else {
            toast({ variant: 'destructive', title: 'An unexpected error occurred.', description: 'Please try again.' });
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


function CheckoutPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const { toast } = useToast();
    const { user, firebaseUser } = useAuth();
    
    const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!planId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No subscription plan was selected.' });
            router.push('/profile/subscription');
            return;
        }
        
        if (!firebaseUser) return;

        async function fetchCheckoutData() {
            try {
                const [allPlans, paymentIntentResult] = await Promise.all([
                    getSubscriptionPlansClient(),
                    createStripePaymentIntent({ planId, userId: firebaseUser!.uid })
                ]);

                const selectedPlan = allPlans.find(p => p.id === planId);
                if (selectedPlan) {
                    setPlan(selectedPlan);
                } else {
                    notFound();
                }

                if (paymentIntentResult.success) {
                    setClientSecret(paymentIntentResult.clientSecret);
                } else {
                    throw new Error(paymentIntentResult.error);
                }

            } catch (error: any) {
                console.error("Failed to fetch checkout data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load checkout page. ' + error.message });
            } finally {
                setLoading(false);
            }
        }
        fetchCheckoutData();
    }, [planId, router, toast, firebaseUser]);
    
    const appearance = {
        theme: 'stripe',
    };
    const options: StripeElementsOptions | undefined = clientSecret ? {
        clientSecret,
        appearance,
    } : undefined;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid md:grid-cols-2 gap-8 pt-6">
                     <Skeleton className="h-96 w-full" />
                     <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    if (!plan || !user) {
        return null;
    }

    const formatLimit = (limit: number) => limit === -1 ? 'Unlimited' : limit;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Complete Your Subscription</h1>
                <p className="text-muted-foreground">You're just one step away from unlocking new features.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4 md:order-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="font-semibold text-lg">{plan.name} Plan</span>
                                {plan.isFeatured && <Badge>Most Popular</Badge>}
                            </div>
                            <Separator />
                            <ul className="space-y-2 text-sm">
                                <PlanFeature>{formatLimit(plan.productLimit)} Product Listings</PlanFeature>
                                <PlanFeature>{formatLimit(plan.sourcingResponseLimit)} Sourcing Responses</PlanFeature>
                                <PlanFeature>{plan.hasAnalytics ? 'Seller Analytics Dashboard' : 'Basic Analytics'}</PlanFeature>
                                {plan.isFeatured && <PlanFeature>Featured Seller Badge</PlanFeature>}
                            </ul>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total Due Today</span>
                                <span>${plan.price.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>

                </div>
                <div className="md:order-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Details</CardTitle>
                            <CardDescription>All transactions are secure and processed by Stripe.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {options && (
                                <Elements options={options} stripe={stripePromise}>
                                    <CheckoutForm plan={plan} user={user} />
                                </Elements>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Skeleton className="h-96 w-full max-w-4xl"/></div>}>
            <CheckoutPageContent />
        </Suspense>
    )
}
