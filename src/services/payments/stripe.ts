

'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';
import { updateUserSubscription } from '@/app/user-actions';

async function getPlanAndUser(planId: string, userId: string): Promise<{ plan: SubscriptionPlan, user: User }> {
    const [planSnap, userSnap] = await Promise.all([
        adminDb.collection('subscriptionPlans').doc(planId).get(),
        adminDb.collection('users').doc(userId).get()
    ]);
    
    if (!planSnap.exists) throw new Error('Subscription plan not found.');
    if (!userSnap.exists) throw new Error('User not found.');

    return {
        plan: { id: planSnap.id, ...planSnap.data() } as SubscriptionPlan,
        user: { uid: userSnap.id, id: userSnap.id, ...userSnap.data() } as User
    };
}

export async function createStripePaymentIntent({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; clientSecret: string; } | { success: false, error: string }> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Stripe is not configured on the server.' };
    }

    try {
        const { plan, user } = await getPlanAndUser(planId, userId);
        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { firebaseUID: userId },
            });
            customerId = customer.id;
            await adminDb.collection('users').doc(userId).update({ stripeCustomerId: customerId });
        }
        
        const descriptionForStripe = `Subscription to ${plan.name} plan for ${user.email}`;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: plan.price * 100,
            currency: plan.currency.toLowerCase(),
            customer: customerId,
            description: descriptionForStripe, // Required for Indian export transactions
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                firebaseUID: userId,
                planId: planId,
            }
        });
        
        if (!paymentIntent.client_secret) {
            throw new Error('Failed to create PaymentIntent.');
        }

        return { success: true, clientSecret: paymentIntent.client_secret };

    } catch (error: any) {
        console.error('Error creating Stripe Payment Intent:', error);
        return { success: false, error: error.message || 'Failed to create payment session.' };
    }
}


export async function verifyStripeSession({ paymentIntentId, userId, planId }: { paymentIntentId: string, userId: string, planId: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Stripe is not configured on the server.' };
    }

    try {
        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            const subscriptionResult = await updateUserSubscription(userId, planId);
            if (subscriptionResult.success) {
                return { success: true, user: subscriptionResult.user };
            } else {
                // This will be caught by the catch block
                throw new Error(subscriptionResult.error);
            }
        } else {
            return { success: false, error: `Payment status is ${paymentIntent.status}` };
        }
    } catch (error: any) {
        console.error('Error verifying Stripe payment and updating subscription:', error);
        return { success: false, error: error.message || 'Failed to verify payment session.' };
    }
}
