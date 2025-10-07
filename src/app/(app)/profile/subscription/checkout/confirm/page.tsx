"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

function ConfirmationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (authLoading) return;
        if (!planId || !paymentIntent) {
            notFound();
        }

        if (redirectStatus === 'succeeded') {
             // Polling for the user context to be updated by the webhook
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
                    setErrorMessage('Your payment was successful, but we are still confirming your subscription. Please check your subscription page or contact support if the issue persists.');
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
        } else if (redirectStatus === 'failed') {
            setStatus('error');
            setErrorMessage('Payment failed. Please try again or contact support.');
        }

    }, [planId, paymentIntent, redirectStatus, user, authLoading, toast, router, status]);


    if (authLoading || status === 'processing') {
         return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl">Finalizing Your Subscription...</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        <p className="text-muted-foreground">
                            Your payment was successful. We are now confirming your subscription status. This page will update automatically.
                        </p>
                    </CardContent>
                </Card>
             </div>
         );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {status === 'success' && 'Subscription Successful!'}
                        {status === 'error' && 'An Error Occurred'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'success' && (
                         <>
                            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                            <p className="text-muted-foreground">
                                Your plan has been upgraded. You can now respond to sourcing requests.
                            </p>
                            <Button className="w-full" asChild>
                                <Link href="/sourcing">
                                    Browse Sourcing Requests
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
