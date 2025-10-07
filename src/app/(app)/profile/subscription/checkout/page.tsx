
"use client";

import React, { useEffect, useState, Suspense } from 'react';
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
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/services/payments/razorpay';

declare global {
    interface Window {
        Razorpay: any;
    }
}


const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);

function CheckoutPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const { toast } = useToast();
    const { user, firebaseUser } = useAuth();
    
    const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingGateway, setProcessingGateway] = useState<string | null>(null);

    useEffect(() => {
        if (!planId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No subscription plan was selected.' });
            router.push('/profile/subscription');
            return;
        }

        async function fetchCheckoutData() {
            try {
                const [allPlans, activeGateways] = await Promise.all([
                    getSubscriptionPlansClient(),
                    getActivePaymentGatewaysClient()
                ]);

                const selectedPlan = allPlans.find(p => p.id === planId);
                if (selectedPlan) {
                    setPlan(selectedPlan);
                } else {
                    notFound();
                }
                setGateways(activeGateways);

            } catch (error) {
                console.error("Failed to fetch checkout data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load checkout page.' });
            } finally {
                setLoading(false);
            }
        }
        fetchCheckoutData();
    }, [planId, router, toast]);

    const handleGatewaySelect = async (gatewayId: string) => {
        if (!planId || !firebaseUser || !plan) return;

        setProcessingGateway(gatewayId);

        if (gatewayId === 'razorpay') {
            try {
                const result = await createRazorpayOrder({ planId, userId: firebaseUser.uid });
                if (!result.success) throw new Error(result.error);

                const { order, user, plan: subscriptionPlan } = result;

                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: "B2B Marketplace",
                    description: `Subscription to ${subscriptionPlan.name} Plan`,
                    order_id: order.id,
                    handler: async (response: any) => {
                        const verificationResult = await verifyRazorpayPayment({
                            ...response,
                            userId: firebaseUser.uid,
                            planId: planId,
                        });
                        
                        if (verificationResult.success) {
                            router.push(`/profile/subscription/checkout/confirm?planId=${planId}`);
                        } else {
                             toast({ variant: 'destructive', title: 'Payment Failed', description: verificationResult.error || 'Payment verification failed.' });
                        }
                    },
                    prefill: {
                        name: user.name,
                        email: user.email,
                        contact: user.phoneNumber
                    },
                    notes: {
                        plan_id: planId,
                        user_id: firebaseUser.uid,
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };
                
                const rzp = new window.Razorpay(options);
                rzp.open();

            } catch (error: any) {
                console.error("Razorpay error:", error);
                toast({ variant: 'destructive', title: 'Payment Error', description: error.message || 'Could not initiate payment.' });
            } finally {
                setProcessingGateway(null);
            }

        } else {
             // Fallback for other gateways like Stripe, etc.
             router.push(`/profile/subscription/checkout/confirm?planId=${planId}&gateway=${gatewayId}`);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid md:grid-cols-2 gap-8 pt-6">
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                     <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    if (!plan) {
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
                <div className="space-y-4">
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
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Payment Method</CardTitle>
                            <CardDescription>All transactions are secure and encrypted.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {gateways.map(gateway => (
                                <Button 
                                    key={gateway.id} 
                                    variant="outline" 
                                    className="w-full h-14 justify-start items-center gap-4" 
                                    onClick={() => handleGatewaySelect(gateway.id)}
                                    disabled={!!processingGateway}
                                >
                                    {processingGateway === gateway.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                        <div className="w-[100px] flex justify-center">
                                            <Image src={gateway.logoUrl} alt={gateway.name} width={80} height={24} style={{ height: 'auto' }} />
                                        </div>
                                    )}
                                     Pay with {gateway.name}
                                </Button>
                            ))}
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
