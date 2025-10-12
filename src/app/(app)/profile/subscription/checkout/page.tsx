
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { getSubscriptionPlansClient, getActivePaymentGatewaysClient } from '@/lib/firebase';
import { SubscriptionPlan, PaymentGateway, User } from '@/lib/types';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { StripeCheckoutForm } from '@/components/stripe-checkout-form';
import { RazorpayCheckoutButton } from '@/components/razorpay-checkout-button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
    const { user, firebaseUser } = useAuth();
    
    const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
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
                if (!user?.address?.street || !user?.address?.city || !user?.address?.zip || !user?.address?.country) {
                    throw new Error("Please complete your primary business address in your profile before proceeding to checkout.");
                }

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

                if (activeGateways.length > 0) {
                    setGateways(activeGateways);
                    // Default to the first available gateway
                    setSelectedGatewayId(activeGateways[0].id);
                } else {
                    setError('No payment methods are configured. Please contact support.');
                }
            } catch (error: any) {
                console.error("Failed to fetch checkout data:", error);
                setError(error.message || 'Could not load checkout page.');
            } finally {
                setLoading(false);
            }
        }
        fetchCheckoutData();
    }, [planId, router, toast, firebaseUser, user]);
    

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
                            <Link href="/profile" className="font-bold underline hover:text-destructive/80">
                                Go to Profile
                            </Link>
                        )}
                    </AlertDescription>
                </Alert>
            </div>
        )
    }
    
    if (!plan || !user || gateways.length === 0) {
        return null;
    }

    const formatLimit = (limit: number | undefined) => limit === -1 ? 'Unlimited' : limit;

    const PlanFeaturesList = ({ plan, user }: { plan: SubscriptionPlan, user: User }) => {
        if (user.role === 'seller') {
            return (
                <>
                    <PlanFeature>{formatLimit(plan.productLimit)} Product Listings</PlanFeature>
                    <PlanFeature>{plan.hasAnalytics ? 'Seller Analytics Dashboard' : 'Basic Analytics'}</PlanFeature>
                </>
            );
        }
        if (user.role === 'buyer') {
             return (
                <>
                    <PlanFeature>{formatLimit(plan.sourcingRequestLimit)} Sourcing Requests</PlanFeature>
                    <PlanFeature>{plan.hasAnalytics ? 'Buyer Analytics Dashboard' : 'Basic Analytics'}</PlanFeature>
                </>
            );
        }
        return null;
    }

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
                                <PlanFeaturesList plan={plan} user={user} />
                                {plan.isFeatured && <PlanFeature>Featured Badge on Profile</PlanFeature>}
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
                            <CardTitle>Payment Method</CardTitle>
                            <CardDescription>Select your preferred payment method.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <RadioGroup value={selectedGatewayId} onValueChange={setSelectedGatewayId} className="space-y-2">
                                {gateways.map(gateway => (
                                    <Label key={gateway.id} htmlFor={gateway.id} className="flex items-center gap-3 rounded-md border p-3 has-[:checked]:border-primary">
                                        <RadioGroupItem value={gateway.id} id={gateway.id} />
                                        <Image src={gateway.logoUrl} alt={gateway.name} width={80} height={25} className="h-auto object-contain"/>
                                    </Label>
                                ))}
                            </RadioGroup>
                            
                            {selectedGatewayId === 'stripe' && (
                                <StripeCheckoutForm plan={plan} user={user} />
                            )}

                            {selectedGatewayId === 'razorpay' && (
                               <RazorpayCheckoutButton plan={plan} user={user} />
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
