
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (authLoading || !planId) {
            return; // Wait until auth is resolved and we have a planId
        }
        
        // If the user's plan is already the target plan, we can show success immediately.
        if (user?.subscriptionPlanId === planId) {
            setStatus('success');
            return;
        }

        // Start polling to check for the subscription update from the webhook.
        const interval = setInterval(() => {
            // The useAuth hook re-fetches user data on auth state changes,
            // but we poll here to catch the backend DB update from the webhook.
            // In a real app, you might use a real-time listener (e.g., onSnapshot) for the user document.
            // For simplicity, we check the existing context state which should update.
            if (user?.subscriptionPlanId === planId) {
                setStatus('success');
                clearInterval(interval);
            }
        }, 2000); // Check every 2 seconds

        // Set a timeout to prevent infinite polling
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
    }, [planId, user, authLoading, status, toast]);


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
                        {status === 'error' && 'Confirmation Delayed'}
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
                                Please check your "Subscription" page in your profile to see your current plan.
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
