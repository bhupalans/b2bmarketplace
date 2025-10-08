
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get('status');
    const planId = searchParams.get('planId');
    const paymentIntentId = searchParams.get('payment_intent'); // From Stripe
    const razorpayPaymentId = searchParams.get('razorpay_payment_id'); // From Razorpay
    const { user, revalidateUser } = useAuth();
    
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        // Immediately revalidate user data when the component mounts.
        // This starts the process of fetching the latest subscription status.
        if (status === 'success') {
            revalidateUser();
        }
    }, [status, revalidateUser]);


    useEffect(() => {
        if (status !== 'success' || !planId) {
            return;
        }

        // Check if the subscription is already confirmed
        if (user?.subscriptionPlanId === planId) {
            setIsConfirmed(true);
            return;
        }

        // Poll for the user's subscription status change
        const interval = setInterval(async () => {
            await revalidateUser();
            // The check will happen in the next render cycle after `user` state updates.
        }, 2000); // Poll every 2 seconds

        // Set a timeout for the polling
        const timeout = setTimeout(() => {
            clearInterval(interval);
            if (!isConfirmed) {
                setTimedOut(true);
            }
        }, 30000); // 30-second timeout

        // Cleanup function
        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [status, planId, user, isConfirmed, revalidateUser]);

    if (status !== 'success') {
         return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Payment Issue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                        <p className="text-destructive">
                            Your payment could not be confirmed or has failed.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Please check your "Subscription" page to see your current plan, or contact support if the problem persists.
                        </p>
                        <Button className="w-full" variant="secondary" asChild>
                            <Link href="/profile/subscription">
                                Return to Subscription Page
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (isConfirmed) {
        const referenceNumber = paymentIntentId || razorpayPaymentId;
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Subscription Confirmed!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                        <p className="text-muted-foreground">
                            Your plan has been upgraded. You now have access to premium features.
                        </p>
                        {referenceNumber && (
                             <div className="text-sm text-muted-foreground pt-4">
                                <p>Payment Reference:</p>
                                <p className="font-mono text-xs break-all">{referenceNumber}</p>
                            </div>
                        )}
                        <Button className="w-full" asChild>
                            <Link href="/dashboard">
                                Go to Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
             </div>
        );
    }

    if (timedOut) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">An Error Occurred</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                        <p>
                            Your payment was successful, but we had trouble confirming your subscription update automatically.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Please refresh the page in a moment or check your subscription status on your profile. If the issue persists, contact support with your reference number.
                        </p>
                         <div className="text-sm text-muted-foreground pt-4">
                            <p>Payment Reference:</p>
                            <p className="font-mono text-xs break-all">{paymentIntentId || razorpayPaymentId}</p>
                        </div>
                        <Button className="w-full" variant="secondary" asChild>
                            <Link href="/profile/subscription">
                                Return to Subscription Page
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
             </div>
        );
    }

    // This is the initial "loading" state
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Finalizing Your Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Loader2 className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground">
                        Your payment was successful! We are now confirming your subscription update. Please do not close this window.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ConfirmationPageContent />
        </Suspense>
    )
}
