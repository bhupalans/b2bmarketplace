
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get('status');
    const { revalidateUser } = useAuth();

    useEffect(() => {
        if (status === 'success') {
            // Trigger a re-fetch of the user data to get the new subscription plan
            revalidateUser();
        }
    }, [status, revalidateUser]);

    if (status === 'success') {
         return (
             <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                        <p className="text-muted-foreground">
                            Your plan has been upgraded. You now have access to premium features.
                        </p>
                        <Button className="w-full" asChild>
                            <Link href="/sourcing">
                                Browse Sourcing Requests
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
             </div>
         );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">An Error Occurred</CardTitle>
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


export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ConfirmationPageContent />
        </Suspense>
    )
}
