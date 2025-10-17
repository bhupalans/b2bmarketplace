
'use server';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';
import { statesProvinces } from '@/lib/geography-data';
import { getPlanAndUser } from '@/lib/database';

export async function createStripePaymentIntent({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; clientSecret: string; } | { success: false, error: string }> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        return { success: false, error: 'Stripe is not configured on the server.' };
    }

    try {
        const { plan, user } = await getPlanAndUser(planId, userId);
        
        const address = user.address;
        if (!address || !address.street || !address.city || !address.zip || !address.country) {
            throw new Error("User profile is missing a complete primary business address, which is required for payment processing. Please complete your profile.");
        }
        
        const countryHasStates = statesProvinces[address.country] && statesProvinces[address.country].length > 0;
        if (countryHasStates && !address.state) {
            throw new Error("Your primary business address is missing a state/province, which is required for payment processing in your country.");
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

        let customerId = user.stripeCustomerId;

        const customerDetails: Stripe.CustomerUpdateParams = {
            email: user.email,
            name: user.name,
            address: {
                line1: address.street,
                city: address.city,
                state: address.state || null,
                postal_code: address.zip,
                country: address.country,
            },
            metadata: { firebaseUID: userId },
        };
        
        if (customerId) {
            await stripe.customers.update(customerId, customerDetails);
        } else {
            const customer = await stripe.customers.create(customerDetails as Stripe.CustomerCreateParams);
            customerId = customer.id;
            await adminDb.collection('users').doc(userId).update({ stripeCustomerId: customerId });
        }
        
        // Determine correct price
        let amount = plan.price;
        let currency = plan.currency;

        const regionalPricing = plan.pricing?.find(p => p.country === user.address?.country);
        if (regionalPricing) {
            amount = regionalPricing.price;
            currency = regionalPricing.currency;
        }
        
        const descriptionForStripe = `Subscription to ${plan.name} plan on B2B Marketplace for user ${user.email}.`;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Price in cents
            currency: currency.toLowerCase(),
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
