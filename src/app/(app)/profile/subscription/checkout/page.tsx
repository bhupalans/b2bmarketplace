
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { getSubscriptionPlansClient } from '@/lib/firebase';
import { SubscriptionPlan } from '@/lib/types';
import { Loader2, CreditCard, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

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
    
    const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!planId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No subscription plan was selected.' });
            router.push('/profile/subscription');
            return;
        }

        async function fetchPlan() {
            try {
                // In a real app, you might fetch only the specific plan
                const allPlans = await getSubscriptionPlansClient();
                const selectedPlan = allPlans.find(p => p.id === planId);
                if (selectedPlan) {
                    setPlan(selectedPlan);
                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Failed to fetch plan:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load plan details.' });
            } finally {
                setLoading(false);
            }
        }
        fetchPlan();
    }, [planId, router, toast]);

    const handleGatewaySelect = (gateway: string) => {
        router.push(`/profile/subscription/checkout/confirm?planId=${planId}&gateway=${gateway}`);
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
                            <Button variant="outline" className="w-full h-14 justify-start items-center" onClick={() => handleGatewaySelect('stripe')}>
                                 <Image src="/stripe-logo.svg" alt="Stripe" width={60} height={24} className="mr-4"/>
                                 Pay with Stripe
                            </Button>
                             <Button variant="outline" className="w-full h-14 justify-start items-center" onClick={() => handleGatewaySelect('paypal')}>
                                 <Image src="/paypal-logo.svg" alt="PayPal" width={80} height={22} className="mr-4"/>
                                 Pay with PayPal
                            </Button>
                             <Button variant="outline" className="w-full h-14 justify-start items-center" onClick={() => handleGatewaySelect('razorpay')}>
                                 <Image src="/razorpay-logo.svg" alt="Razorpay" width={90} height={20} className="mr-4"/>
                                 Pay with Razorpay
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CheckoutPageContent />
        </Suspense>
    )
}
