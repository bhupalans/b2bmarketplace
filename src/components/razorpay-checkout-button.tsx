
"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionPlan, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/services/payments/razorpay';
import { useAuth } from '@/contexts/auth-context';

declare const Razorpay: any;

export function RazorpayCheckoutButton({ plan, user }: { plan: SubscriptionPlan, user: User }) {
    const [isProcessing, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();
    const { firebaseUser, revalidateUser } = useAuth();

    const handlePayment = async () => {
        if (!firebaseUser) return;
        
        startTransition(async () => {
            try {
                const orderResult = await createRazorpayOrder({ planId: plan.id, userId: user.uid });
                if (!orderResult.success) {
                    throw new Error(orderResult.error);
                }

                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: orderResult.order.amount,
                    currency: orderResult.order.currency,
                    name: "B2B Marketplace",
                    description: `Subscription to ${plan.name} Plan`,
                    order_id: orderResult.order.id,
                    handler: async function (response: any) {
                        const verificationResult = await verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: user.uid,
                            planId: plan.id
                        });

                        if (verificationResult.success) {
                            // Don't revalidate here, the confirmation page will poll.
                            router.push(`/profile/subscription/checkout/confirm?status=success&planId=${plan.id}&razorpay_payment_id=${response.razorpay_payment_id}`);
                        } else {
                            router.push('/profile/subscription/checkout/confirm?status=failure');
                        }
                    },
                    prefill: {
                        name: orderResult.user.name,
                        email: orderResult.user.email,
                        contact: orderResult.user.phoneNumber,
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };

                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response: any) {
                    toast({
                        variant: 'destructive',
                        title: 'Payment Failed',
                        description: response.error.description || 'An unknown error occurred with Razorpay.',
                    });
                });
                rzp.open();

            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.message || "Failed to initiate Razorpay payment.",
                });
            }
        });
    };

    return (
        <Button onClick={handlePayment} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay with Razorpay
        </Button>
    );
}
