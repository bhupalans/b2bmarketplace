
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { verifyStripeSession } from '@/services/payments/stripe';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const stripeSessionId = searchParams.get('stripe_session_id');

    const { user, firebaseUser, updateUserContext, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (authLoading || !planId || !firebaseUser) {
            return; // Wait until auth is resolved and we have necessary info
        }
        
        // If the UI context already reflects the correct plan, we're done.
        if (user?.subscriptionPlanId === planId) {
            setStatus('success');
            return;
        }

        if (stripeSessionId) {
            // --- New Stripe Flow: Actively verify from the client ---
            const verifyAndUpgrade = async () => {
                try {
                    const result = await verifyStripeSession({ 
                        sessionId: stripeSessionId,
                        userId: firebaseUser.uid,
                        planId: planId
                    });
                    
                    if (result.success && result.paid && result.user) {
                        // The server action now returns the updated user
                        updateUserContext(result.user);
                        setStatus('success');
                    } else {
                        // The server action handled the error logging, just show it to the user.
                        throw new Error(result.error || "Could not confirm your payment status with Stripe.");
                    }
                } catch (err: any) {
                    console.error("Confirmation Error:", err);
                    setErrorMessage(err.message || 'An unknown error occurred during confirmation.');
                    setStatus('error');
                    toast({
                        variant: 'destructive',
                        title: 'Subscription Update Failed',
                        description: err.message || 'Please contact support.'
                    });
                }
            };
            verifyAndUpgrade();
        } else {
            // --- Fallback for non-Stripe or webhook-reliant flows ---
            const interval = setInterval(() => {
                // Check if the auth context has been updated in the background
                if (user?.subscriptionPlanId === planId) {
                    setStatus('success');
                    clearInterval(interval);
                }
            }, 2000); 

            const timeout = setTimeout(() => {
                clearInterval(interval);
                if (status !== 'success') {
                    setStatus('error');
                    setErrorMessage('The payment was successful, but we are still confirming your subscription. Please check your messages page or contact support if the issue persists.');
                    toast({
                        variant: 'destructive',
                        title: 'Confirmation Timed Out',
                        description: 'Your payment was successful, but the subscription update is taking longer than expected.'
                    })
                }
            }, 45000); // 45 seconds timeout

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }

    }, [planId, stripeSessionId, user, firebaseUser, authLoading, updateUserContext, toast, status]);


    if (!planId) {
        notFound();
    }
    
    if (authLoading) {
         return (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
             </div>
         );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {status === 'processing' && 'Finalizing Your Subscription...'}
                        {status === 'success' && 'Subscription Successful!'}
                        {status === 'error' && 'An Error Occurred'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                            <p className="text-muted-foreground">
                                Your payment was successful. We are now confirming your subscription status. This page will update automatically.
                            </p>
                        </>
                    )}
                    {status === 'success' && (
                         <>
                            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                            <p className="text-muted-foreground">
                                Your plan has been upgraded. Any existing leads have been converted to conversations in your inbox.
                            </p>
                            <Button className="w-full" asChild>
                                <Link href="/messages">
                                    Go to My Messages
                                </Link>
                            </Button>
                        </>
                    )}
                     {status === 'error' && (
                         <>
                            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                            <p className="text-destructive">
                                {errorMessage}
                            </p>
                             <p className="text-sm text-muted-foreground">
                                Please check your "Subscription" page in your profile to see your current plan, or contact support if the problem persists.
                            </p>
                            <Button className="w-full" variant="secondary" asChild>
                                <Link href="/profile/subscription">
                                    Return to Subscription Page
                                </Link>
                            </Button>
                        </>
                    )}
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
