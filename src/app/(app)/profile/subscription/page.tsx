
"use client";

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getSubscriptionPlansClient, getSourcingRequestsClient, getSellerProductsClient } from '@/lib/firebase';
import { SubscriptionPlan, User, SourcingRequest, Product } from '@/lib/types';
import { Loader2, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);

export default function SubscriptionPage() {
    const { user, firebaseUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [sourcingRequests, setSourcingRequests] = useState<SourcingRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    
    useEffect(() => {
        if (!user) {
            if (!authLoading) setLoading(false);
            return;
        };

        async function fetchData() {
            try {
                setLoading(true);
                const fetchedPlans = await getSubscriptionPlansClient();

                const relevantPlans = fetchedPlans
                    .filter(p => p.status === 'active' && p.type === user.role)
                    .sort((a,b) => a.price - b.price);
                
                setPlans(relevantPlans);
                
                if (user.role === 'buyer') {
                    const fetchedSourcingRequests = await getSourcingRequestsClient({ buyerId: user.uid });
                    setSourcingRequests(fetchedSourcingRequests);
                } else if (user.role === 'seller') {
                    const fetchedProducts = await getSellerProductsClient(user.uid);
                    setProducts(fetchedProducts);
                }

            } catch (error) {
                console.error("Failed to fetch subscription data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load subscription plans.' });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, authLoading, toast]);
    
    const handleSelectPlan = (plan: SubscriptionPlan) => {
        if (!firebaseUser) return;
        router.push(`/profile/subscription/checkout?planId=${plan.id}`);
    }

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!user || (user.role !== 'seller' && user.role !== 'buyer')) {
        return <div className="text-center py-10">This page is for buyers and sellers only.</div>;
    }

    const formatLimit = (limit: number | undefined) => {
        if (limit === undefined || limit === null) return 'N/A';
        return limit === -1 ? 'Unlimited' : limit;
    }
    
    const hasActiveSubscription = user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > new Date();
    const currentPlan = hasActiveSubscription ? user.subscriptionPlan : plans.find(p => p.price === 0);
    
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">
                    Choose the plan that best fits your business needs to unlock more features.
                </p>
            </div>
            
            {currentPlan && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Current Plan: {currentPlan.name}</CardTitle>
                         <CardDescription>
                            {hasActiveSubscription ? (
                                `Your access to premium features is active until ${format(new Date(user.subscriptionExpiryDate!), 'PPP')}.`
                            ) : (
                                "You are currently on the Free plan."
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm">
                            {user.role === 'buyer'
                                ? `You have posted ${sourcingRequests.length} of ${formatLimit(currentPlan.sourcingRequestLimit)} sourcing requests.`
                                : `You have listed ${products.length} of ${formatLimit(currentPlan.productLimit)} products.`
                            }
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isCurrentPlan = hasActiveSubscription && plan.price > 0;
                    const isCurrentFreePlan = !hasActiveSubscription && plan.price === 0;

                    const regionalPrice = user.address?.country ? plan.pricing?.find(p => p.country === user.address.country) : undefined;
                    
                    const displayPrice = regionalPrice ? regionalPrice.price : plan.price;
                    const displayCurrency = regionalPrice ? regionalPrice.currency : plan.currency;

                    const formattedDisplayPrice = new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: displayCurrency,
                    }).format(displayPrice);

                    return (
                    <Card key={plan.id} className={cn("flex flex-col", (isCurrentPlan || isCurrentFreePlan) && "ring-2 ring-primary")}>
                        {plan.isFeatured && (
                            <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-1 rounded-t-lg flex items-center justify-center gap-1">
                               <Star className="h-3 w-3" /> Most Popular
                            </div>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>
                                <span className="text-4xl font-bold text-foreground">
                                    {plan.price > 0 ? formattedDisplayPrice : 'Free'}
                                </span>
                                {plan.price > 0 && <span className="text-muted-foreground"> / year</span>}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <ul className="space-y-2">
                                {user.role === 'seller' ? (
                                    <PlanFeature>{formatLimit(plan.productLimit)} Product Listings</PlanFeature>
                                ) : (
                                    <PlanFeature>{formatLimit(plan.sourcingRequestLimit)} Sourcing Requests</PlanFeature>
                                )}
                                <PlanFeature>{plan.hasAnalytics ? 'Advanced Analytics' : 'Basic Analytics'}</PlanFeature>
                                {plan.isFeatured && <PlanFeature>Featured Badge</PlanFeature>}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            {(isCurrentPlan || isCurrentFreePlan) ? (
                                <Button disabled className="w-full">Current Plan</Button>
                            ) : (
                                <Button onClick={() => handleSelectPlan(plan)} className="w-full">
                                    {plan.price > 0 ? 'Upgrade Plan' : 'Switch to Free'}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )})}
            </div>
        </div>
    );
}
