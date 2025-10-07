
'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { SubscriptionPlan, User } from '@/lib/types';
import { updateUserSubscription } from './user-actions';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createRazorpayOrder({ planId, userId }: { planId: string, userId: string }): Promise<{ success: true; order: any, user: User, plan: SubscriptionPlan } | { success: false, error: string }> {

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return { success: false, error: 'Razorpay is not configured on the server.'};
    }
    
    try {
        const [planSnap, userSnap] = await Promise.all([
            adminDb.collection('subscriptionPlans').doc(planId).get(),
            adminDb.collection('users').doc(userId).get()
        ]);
        
        if (!planSnap.exists) {
            return { success: false, error: 'Subscription plan not found.' };
        }
        if (!userSnap.exists) {
            return { success: false, error: 'User not found.' };
        }
        
        const plan = planSnap.data() as SubscriptionPlan;
        const user = userSnap.data() as User;
        
        const options = {
            amount: plan.price * 100, // amount in the smallest currency unit
            currency: plan.currency, // Use currency from the plan
            receipt: `receipt_plan_${planId}_${new Date().getTime()}`
        };

        const order = await razorpay.orders.create(options);
        
        return { success: true, order, user, plan };

    } catch(error: any) {
        console.error('Error creating Razorpay order:', error);
        return { success: false, error: 'Failed to create payment order.' };
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
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');
            
        if (expectedSignature === razorpay_signature) {
            // Signature is valid, now update the user's subscription
            const subscriptionResult = await updateUserSubscription(userId, planId);
            
            if (!subscriptionResult.success) {
                throw new Error(subscriptionResult.error);
            }
            
            return { success: true };
            
        } else {
            return { success: false, error: 'Invalid payment signature.' };
        }

    } catch(error: any) {
        console.error('Error verifying Razorpay payment:', error);
        return { success: false, error: 'Payment verification failed on the server.' };
    }
}
