
"use client";

import React, { Suspense } from 'react';
import { useSearchParams, notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function ConfirmationPageContent() {
    const searchParams = useSearchParams();
    const planId = searchParams.get('planId');
    const gateway = searchParams.get('gateway');

    if (!planId || !gateway) {
        notFound();
    }

    const gatewayName = gateway.charAt(0).toUpperCase() + gateway.slice(1);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Confirm Your Subscription</CardTitle>
                    <CardDescription>
                        You will be redirected to {gatewayName} to complete your payment securely.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                    <p className="text-muted-foreground">
                        Simulating redirection to payment processor...
                    </p>
                    <p className="text-sm">
                        In a real application, clicking the button below would activate the subscription after a successful payment webhook is received from {gatewayName}.
                    </p>
                    <Button className="w-full" asChild>
                        <Link href="/profile/subscription">
                            (Simulation) Go Back to Subscriptions
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
