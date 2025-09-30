
"use client";

import React, { Suspense, useEffect, useState, useTransition } from 'react';
import { useSearchParams, notFound, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { updateUserSubscription } from '@/app/user-actions';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

function ConfirmationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    
    const { firebaseUser, updateUserContext } = useAuth();
    const { toast } = useToast();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!planId || !firebaseUser) {
            setStatus('error');
            setErrorMessage('Missing plan details or user session.');
            return;
        }

        const timer = setTimeout(() => {
            startTransition(async () => {
                try {
                    const result = await updateUserSubscription(firebaseUser.uid, planId);
                    if (result.success && result.user) {
                        updateUserContext(result.user);
                        toast({
                            title: 'Subscription Activated!',
                            description: `You are now on the ${result.user.subscriptionPlan?.name} plan.`,
                        });
                        setStatus('success');
                    } else {
                        throw new Error(result.error || 'An unknown error occurred.');
                    }
                } catch (err: any) {
                    console.error('Subscription update failed:', err);
                    setErrorMessage(err.message || 'Failed to update subscription.');
                    setStatus('error');
                    toast({
                        variant: 'destructive',
                        title: 'Update Failed',
                        description: err.message || 'An unknown error occurred during subscription update.',
                    });
                }
            });
        }, 2500); // Simulate processing delay

        return () => clearTimeout(timer);
    }, [planId, firebaseUser, toast, updateUserContext]);

    if (!planId) {
        notFound();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {status === 'processing' && 'Finalizing Your Subscription...'}
                        {status === 'success' && 'Subscription Successful!'}
                        {status === 'error' && 'Subscription Failed'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                            <p className="text-muted-foreground">
                                Please wait while we securely process your subscription. Do not close this page.
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
                                Please try again or contact support if the problem persists.
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
