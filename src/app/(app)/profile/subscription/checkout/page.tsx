

"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { getSubscriptionPlansClient } from '@/lib/firebase';
import { SubscriptionPlan, User } from '@/lib/types';
import { CreditCard, Lock, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
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
import { verifyStripeSession } from '@/app/user-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);


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
            toast({ variant: 'destructive', title: 'Payment Failed', description: submitError.message });
            setIsProcessing(false);
            return;
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
                // Return URL is not needed for this flow. The success path is handled below.
            },
            redirect: 'if_required' // This is crucial to prevent unnecessary redirects
        });

        if (error) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            toast({ title: 'Payment Successful', description: 'Finalizing your subscription...' });

            // Now that payment is confirmed on the client, verify on the server and update subscription.
            // This action now returns a simple success/error object.
            const verificationResult = await verifyStripeSession({
                paymentIntentId: paymentIntent.id,
                userId: user.uid,
                planId: plan.id,
            });

            if (verificationResult.success) {
                // On success, redirect. The AuthProvider will handle refreshing user state.
                router.push(`/profile/subscription/checkout/confirm?status=success`);
            } else {
                toast({ variant: 'destructive', title: 'Subscription Update Failed', description: verificationResult.error || 'Please contact support.' });
            }
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
    const [error, setError] = useState<string | null>(null);

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
                    createStripePaymentIntent({ planId: planId!, userId: firebaseUser!.uid })
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
                setError(error.message || 'Could not load checkout page.');
                toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not load checkout page.' });
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
    
    if (error) {
        return (
            <div className="max-w-4xl mx-auto">
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Checkout Error</AlertTitle>
                    <AlertDescription>
                        <p>{error}</p>
                        {error.includes('address') && (
                             <Button asChild className="mt-4">
                                <Link href="/profile">Go to Profile</Link>
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }
    
    if (!plan || !user || !clientSecret) {
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
                                    <CheckoutForm plan={plan} user={user} clientSecret={clientSecret} />
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
