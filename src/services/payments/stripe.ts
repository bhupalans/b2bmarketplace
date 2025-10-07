
'use server';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';

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
        
        if (!user.address || !user.address.street || !user.address.city || !user.address.state || !user.address.zip || !user.address.country) {
            throw new Error("User profile is missing a complete primary business address, which is required for payment processing. Please complete your profile.");
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

        let customerId = user.stripeCustomerId;

        const customerDetails = {
            email: user.email,
            name: user.name,
            address: {
                line1: user.address.street,
                city: user.address.city,
                state: user.address.state,
                postal_code: user.address.zip,
                country: user.address.country,
            },
            metadata: { firebaseUID: userId },
        };
        
        if (customerId) {
            await stripe.customers.update(customerId, customerDetails);
        } else {
            const customer = await stripe.customers.create(customerDetails);
            customerId = customer.id;
            await adminDb.collection('users').doc(userId).update({ stripeCustomerId: customerId });
        }
        
        const descriptionForStripe = `Subscription to ${plan.name} plan on B2B Marketplace for user ${user.email}.`;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: plan.price * 100,
            currency: plan.currency.toLowerCase(),
            customer: customerId,
            description: descriptionForStripe,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                firebaseUID: userId,
                planId: planId,
                planName: plan.name,
                customerEmail: user.email
            },
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
