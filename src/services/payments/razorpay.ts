
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';
import { getPlanAndUser } from '@/lib/database';
import { add } from 'date-fns';

export async function createRazorpayOrder({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; order: any, user: User, plan: SubscriptionPlan } | { success: false, error: string }> {

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return { success: false, error: 'Razorpay is not configured on the server.'};
    }
    
    try {
        const { plan, user } = await getPlanAndUser(planId, userId);
        
        let amount = plan.price;
        let currency = plan.currency;

        const regionalPricing = plan.pricing?.find(p => p.country === user.address?.country);
        if (regionalPricing) {
            amount = regionalPricing.price;
            currency = regionalPricing.currency;
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
        
        const options = {
            amount: amount * 100, // amount in the smallest currency unit
            currency: currency,
            receipt: `rcpt_${userId.substring(0, 4)}_${Date.now()}`.substring(0, 40)
        };

        const order = await razorpay.orders.create(options);
        
        return { success: true, order, user, plan };

    } catch(error: any) {
        console.error('Error creating Razorpay order:', error);
        // Log the detailed error from Razorpay
        const detailedError = error.error?.description ? `Razorpay Error: ${error.error.description}` : error.message;
        return { success: false, error: detailedError || 'Failed to create payment order.' };
    }
}

export async function verifyRazorpayPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    planId
}: {
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
    userId: string,
    planId: string,
}): Promise<{ success: boolean; error?: string }> {

    try {
        if (!process.env.RAZORPAY_KEY_SECRET) {
            throw new Error("Razorpay secret key is not configured.");
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');
            
        if (expectedSignature === razorpay_signature) {
            // Signature is valid, now update the user's subscription
            const userRef = adminDb.collection('users').doc(userId);
            
            // Calculate expiry date: one year from now
            const expiryDate = add(new Date(), { years: 1 });

            // Update user with the new plan and expiry date
            await userRef.update({ 
                subscriptionPlanId: planId,
                subscriptionExpiryDate: expiryDate.toISOString()
            });

            console.log(`Razorpay Yearly: Successfully updated subscription for user ${userId} to plan ${planId}, expiring on ${expiryDate.toISOString()}.`);
            
            return { success: true };
            
        } else {
            return { success: false, error: 'Invalid payment signature.' };
        }

    } catch(error: any) {
        console.error('Error verifying Razorpay payment:', error);
        return { success: false, error: error.message || 'Payment verification failed on the server.' };
    }
}
