
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';

// This function is defined here because it's only used by this payment action.
// In a larger app, it might be in a shared lib/database file.
async function getPlanAndUser(planId: string, userId: string): Promise<{ plan: SubscriptionPlan, user: User }> {
    const [planSnap, userSnap] = await Promise.all([
        adminDb.collection('subscriptionPlans').doc(planId).get(),
        adminDb.collection('users').doc(userId).get()
    ]);
    
    if (!planSnap.exists) {
        throw new Error('Subscription plan not found.');
    }
    if (!userSnap.exists) {
        throw new Error('User not found.');
    }

    return {
        plan: planSnap.data() as SubscriptionPlan,
        user: userSnap.data() as User
    }
}


export async function createRazorpayOrder({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; order: any, user: User, plan: SubscriptionPlan } | { success: false, error: string }> {

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return { success: false, error: 'Razorpay is not configured on the server.'};
    }
    
    try {
        const { plan, user } = await getPlanAndUser(planId, userId);
        
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
        
        const options = {
            amount: plan.price * 100, // amount in the smallest currency unit
            currency: plan.currency.toLowerCase(),
            receipt: `receipt_plan_${planId}_${new Date().getTime()}`
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
            await userRef.update({ subscriptionPlanId: planId });
            console.log(`Razorpay: Successfully updated subscription for user ${userId} to plan ${planId}.`);
            
            return { success: true };
            
        } else {
            return { success: false, error: 'Invalid payment signature.' };
        }

    } catch(error: any) {
        console.error('Error verifying Razorpay payment:', error);
        return { success: false, error: error.message || 'Payment verification failed on the server.' };
    }
}
