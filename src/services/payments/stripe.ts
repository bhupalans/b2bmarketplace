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

export async function createStripeCheckoutSession({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; sessionId: string; } | { success: false, error: string }> {
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Stripe is not configured on the server.' };
    }

    try {
        const { plan, user } = await getPlanAndUser(planId, userId);
        
        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

        // Check if user already exists in Stripe, if not create them
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    firebaseUID: userId,
                },
            });
            customerId = customer.id;
            // Save the new customer ID to the user's profile in Firestore
            await adminDb.collection('users').doc(userId).update({ stripeCustomerId: customerId });
        }
        
        const baseUrl = headers().get('origin') || `https://${headers().get('host')}`;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: customerId,
            line_items: [
                {
                    price_data: {
                        currency: plan.currency.toLowerCase(),
                        product_data: {
                            name: `${plan.name} Plan`,
                            description: `Subscription to the ${plan.name} plan on B2B Marketplace`,
                        },
                        unit_amount: plan.price * 100, // Amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment', // Use 'subscription' mode for recurring payments
            success_url: `${baseUrl}/profile/subscription/checkout/confirm?planId=${planId}&stripe_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/profile/subscription/checkout?planId=${planId}`,
            metadata: {
                firebaseUID: userId,
                planId: planId,
            }
        });

        if (!session.id) {
            throw new Error('Failed to create Stripe session.');
        }

        return { success: true, sessionId: session.id };

    } catch (error: any) {
        console.error('Error creating Stripe checkout session:', error);
        return { success: false, error: error.message || 'Failed to create payment session.' };
    }
}

export async function verifyStripeSession({ sessionId, userId, planId }: { sessionId: string, userId: string, planId: string }): Promise<{ success: boolean; paid?: boolean; error?: string; user?: User }> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Stripe is not configured on the server.' };
    }

    try {
        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const subscriptionResult = await updateUserSubscription(userId, planId);
            if (subscriptionResult.success) {
                return { success: true, paid: true, user: subscriptionResult.user };
            } else {
                throw new Error(subscriptionResult.error);
            }
        } else {
            return { success: true, paid: false, error: `Payment status is ${session.payment_status}` };
        }
    } catch (error: any) {
        console.error('Error verifying Stripe session and updating subscription:', error);
        return { success: false, error: error.message || 'Failed to verify payment session.' };
    }
}
