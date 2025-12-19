
"use client";

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getSubscriptionPlansClient, getSourcingRequestsClient, getSellerProductsClient } from '@/lib/firebase';
import { SubscriptionPlan, User, SourcingRequest, Product } from '@/lib/types';
import { Loader2, CheckCircle, Star, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { manageSubscriptionRenewal } from '@/app/user-actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);

export default function SubscriptionPage() {
    const { user, firebaseUser, loading: authLoading, revalidateUser } = useAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [sourcingRequests, setSourcingRequests] = useState<SourcingRequest[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCancelling, startCancelTransition] = useTransition();
    const [isReactivating, startReactivateTransition] = useTransition();
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
        
        if (plan.price === 0) {
            handleCancelSubscription();
        } else {
             router.push(`/profile/subscription/checkout?planId=${plan.id}`);
        }
    }
    
    const handleCancelSubscription = () => {
        if (!user || !user.subscriptionPlanId || user.renewalCancelled) return;
        startCancelTransition(async () => {
            const result = await manageSubscriptionRenewal(user.uid, 'cancel');
            if (result.success) {
                toast({ title: "Subscription Cancelled", description: "Your plan will not renew. You will have access until your current term ends." });
                await revalidateUser();
            } else {
                toast({ variant: 'destructive', title: "Cancellation Failed", description: result.error });
            }
        });
    }

     const handleReactivateSubscription = () => {
        if (!user || !user.subscriptionPlanId || !user.renewalCancelled) return;
        startReactivateTransition(async () => {
            const result = await manageSubscriptionRenewal(user.uid, 'reactivate');
            if (result.success) {
                toast({ title: "Subscription Reactivated", description: "Your plan will now renew at the end of its term." });
                await revalidateUser();
            } else {
                toast({ variant: 'destructive', title: "Reactivation Failed", description: result.error });
            }
        });
    }

    const { currentPlan, usageCount } = useMemo(() => {
        if (!user || plans.length === 0) {
            return { currentPlan: null, usageCount: 0 };
        }
        const hasActiveSubscription = user.subscriptionPlanId && user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > new Date();
        
        let plan = hasActiveSubscription ? user.subscriptionPlan : plans.find(p => p.price === 0);
        let count = user.role === 'seller' ? products.length : sourcingRequests.length;
        
        return { currentPlan: plan, usageCount: count };

    }, [user, plans, products, sourcingRequests]);

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
    const isCancelled = hasActiveSubscription && user.renewalCancelled;
    
    const daysUntilExpiry = user.subscriptionExpiryDate ? differenceInDays(new Date(user.subscriptionExpiryDate), new Date()) : null;
    const showExpirationWarning = hasActiveSubscription && !isCancelled && daysUntilExpiry !== null && daysUntilExpiry <= 30;

    
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">
                    Choose the plan that best fits your business needs to unlock more features.
                </p>
            </div>
            
             {showExpirationWarning && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Your Subscription is Expiring Soon!</AlertTitle>
                    <AlertDescription>
                        Your plan will expire in {daysUntilExpiry} day(s). Renew now to maintain access to premium features.
                        <Button asChild variant="link" className="p-0 h-auto ml-1 text-destructive hover:text-destructive/80">
                            <Link href={`/profile/subscription/checkout?planId=${user.subscriptionPlanId}`}>Renew Now</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {currentPlan && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Current Plan: {currentPlan.name}</CardTitle>
                         <CardDescription>
                            {isCancelled ? (
                                `Your plan was cancelled and is set to expire on ${format(new Date(user.subscriptionExpiryDate!), 'PPP')}.`
                            ) : hasActiveSubscription ? (
                                `Your plan is active and renews on ${format(new Date(user.subscriptionExpiryDate!), 'PPP')}.`
                            ) : (
                                "You are currently on the Free plan."
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm">
                            {user.role === 'buyer'
                                ? `You have posted ${usageCount} of ${formatLimit(currentPlan.sourcingRequestLimit)} sourcing requests.`
                                : `You have listed ${usageCount} of ${formatLimit(currentPlan.productLimit)} products.`
                            }
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isCurrentPaidPlan = hasActiveSubscription && plan.id === currentPlan?.id;
                    const isCurrentFreePlan = !hasActiveSubscription && plan.price === 0;
                    
                    const regionalPrice = user.address?.country ? plan.pricing?.find(p => p.country === user.address.country) : undefined;
                    
                    const displayPrice = regionalPrice ? regionalPrice.price : plan.price;
                    const displayCurrency = regionalPrice ? regionalPrice.currency : plan.currency;

                    const formattedDisplayPrice = new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: displayCurrency,
                    }).format(displayPrice);

                    const showFeaturedBadge = plan.isFeatured && plan.price > 0;

                    return (
                    <Card key={plan.id} className={cn("flex flex-col", (isCurrentPaidPlan || isCurrentFreePlan) && !isCancelled && "ring-2 ring-primary")}>
                        {showFeaturedBadge && (
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
                                    <>
                                        <PlanFeature>{formatLimit(plan.productLimit)} Product Listings</PlanFeature>
                                        {plan.price > 0 
                                            ? <PlanFeature>Initiate conversations with buyers</PlanFeature>
                                            : <PlanFeature>Respond to buyer inquiries</PlanFeature>
                                        }
                                    </>
                                ) : (
                                    <>
                                        <PlanFeature>{formatLimit(plan.sourcingRequestLimit)} Sourcing Requests</PlanFeature>
                                        {plan.price > 0
                                            ? <PlanFeature>Interact directly with Sellers</PlanFeature>
                                            : <PlanFeature>Respond to Inquiries</PlanFeature>
                                        }
                                    </>
                                )}
                                <PlanFeature>{plan.hasAnalytics ? 'Advanced Analytics' : 'Basic Analytics'}</PlanFeature>
                                {plan.isFeatured && <PlanFeature>Featured Badge on Profile</PlanFeature>}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            {isCurrentFreePlan ? (
                                <Button disabled className="w-full">Current Plan</Button>
                            ) : isCurrentPaidPlan && !isCancelled ? (
                                <Button onClick={handleCancelSubscription} variant="destructive" className="w-full" disabled={isCancelling}>
                                    {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Cancel Renewal
                                </Button>
                            ) : isCurrentPaidPlan && isCancelled ? (
                                <Button onClick={handleReactivateSubscription} className="w-full" disabled={isReactivating}>
                                    {isReactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reactivate
                                </Button>
                            ) : (
                                <Button onClick={() => handleSelectPlan(plan)} className="w-full" disabled={isCancelling || isReactivating || (plan.price > 0 && isCancelled)}>
                                     {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
