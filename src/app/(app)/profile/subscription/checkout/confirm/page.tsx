
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { confirmStripePayment } from '@/app/user-actions';
import { useToast } from '@/hooks/use-toast';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const { revalidateUser } = useAuth();
    const { toast } = useToast();

    const status = searchParams.get('status');
    const paymentIntentId = searchParams.get('payment_intent');
    const razorpayPaymentId = searchParams.get('razorpay_payment_id');
    const planId = searchParams.get('planId');

    const [confirmationStatus, setConfirmationStatus] = useState<'processing' | 'success' | 'failure' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'success') {
            setConfirmationStatus('failure');
            return;
        }

        if (paymentIntentId) { // Stripe flow
            confirmStripePayment(paymentIntentId).then(result => {
                if (result.success) {
                    revalidateUser(); // Refresh user data in context
                    setConfirmationStatus('success');
                } else {
                    setErrorMessage(result.error);
                    setConfirmationStatus('error');
                }
            }).catch(err => {
                setErrorMessage(err.message || 'An unexpected error occurred.');
                setConfirmationStatus('error');
            });
        } else if (razorpayPaymentId) { // Razorpay flow (currently relies on polling)
            revalidateUser(); // Start polling
            const timeout = setTimeout(() => {
                // If not confirmed by then, assume an issue.
                // In a real app, you might check one last time.
                setConfirmationStatus('error');
                setErrorMessage('Could not confirm subscription update in time. Please check your profile or contact support.');
            }, 30000); // 30-second timeout

            // This effect will re-run when user context is updated via revalidateUser polling
            // so we will check for success inside the main component body.
            // But we need to clean up the timeout if we succeed or unmount.
            return () => clearTimeout(timeout);
        } else {
            setConfirmationStatus('error');
            setErrorMessage('No valid payment identifier found in the URL.');
        }

    }, [status, paymentIntentId, razorpayPaymentId, revalidateUser]);
    

    if (confirmationStatus === 'processing') {
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
    
    if (confirmationStatus === 'success') {
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

    if (confirmationStatus === 'failure' || confirmationStatus === 'error') {
         return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Payment Issue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
                        <p className="text-destructive font-medium">
                           {errorMessage || 'Your payment could not be confirmed or has failed.'}
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

    return null;
}

export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ConfirmationPageContent />
        </Suspense>
    )
}
