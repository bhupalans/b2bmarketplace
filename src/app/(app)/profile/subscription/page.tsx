
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getSubscriptionPlansClient } from '@/lib/firebase';
import { SubscriptionPlan } from '@/lib/types';
import { Loader2, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserSubscription } from '@/app/user-actions';
import { useRouter } from 'next/navigation';

const PlanFeature = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">{children}</span>
    </li>
);

export default function SubscriptionPage() {
    const { user, firebaseUser, updateUserContext, loading: authLoading } = useAuth();
    const router = useRouter();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, startTransition] = useTransition();
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const { toast } = useToast();
    
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const fetchedPlans = await getSubscriptionPlansClient();
                const activePlans = fetchedPlans.filter(p => p.status === 'active').sort((a,b) => a.price - b.price);
                setPlans(activePlans);
            } catch (error) {
                console.error("Failed to fetch subscription plans:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load subscription plans.' });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast]);
    
    const handleSelectPlan = (plan: SubscriptionPlan) => {
        if (!firebaseUser) return;
        
        // If the plan is paid, redirect to checkout
        if (plan.price > 0) {
            router.push(`/profile/subscription/checkout?planId=${plan.id}`);
            return;
        }

        // If the plan is free (downgrade)
        setSelectedPlanId(plan.id);
        startTransition(async () => {
            const result = await updateUserSubscription(firebaseUser.uid, plan.id);
            if (result.success && result.user) {
                updateUserContext(result.user);
                toast({ title: 'Plan Updated', description: `You are now on the ${result.user.subscriptionPlan?.name} plan.`});
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error || 'An unknown error occurred.' });
            }
            setSelectedPlanId(null);
        });
    }

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (user?.role !== 'seller') {
        return <div className="text-center py-10">This page is for sellers only.</div>;
    }

    const formatLimit = (limit: number) => limit === -1 ? 'Unlimited' : limit;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">
                    Choose the plan that best fits your business needs to unlock more features.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isCurrentPlan = user?.subscriptionPlanId === plan.id;
                    const isProcessingThisPlan = isSubmitting && selectedPlanId === plan.id;
                    return (
                    <Card key={plan.id} className={cn("flex flex-col", plan.isFeatured && "border-primary shadow-lg", isCurrentPlan && "ring-2 ring-primary")}>
                        {plan.isFeatured && (
                            <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-1 rounded-t-lg flex items-center justify-center gap-1">
                               <Star className="h-3 w-3" /> Most Popular
                            </div>
                        )}
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">{plan.name}</CardTitle>
                            <CardDescription>
                                <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                                <span className="text-muted-foreground"> / month</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <ul className="space-y-2">
                                <PlanFeature>{formatLimit(plan.productLimit)} Product Listings</PlanFeature>
                                <PlanFeature>{formatLimit(plan.sourcingResponseLimit)} Sourcing Responses</PlanFeature>
                                <PlanFeature>{plan.hasAnalytics ? 'Seller Analytics Dashboard' : 'Basic Analytics'}</PlanFeature>
                                {plan.isFeatured && <PlanFeature>Featured Seller Badge</PlanFeature>}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            {isCurrentPlan ? (
                                <Button disabled className="w-full">Current Plan</Button>
                            ) : (
                                <Button onClick={() => handleSelectPlan(plan)} className="w-full" disabled={isSubmitting}>
                                    {isProcessingThisPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Select Plan'}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )})}
            </div>
        </div>
    );
}
