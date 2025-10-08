
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { updateUserSubscription } from '@/app/user-actions';
import { revalidateTag } from 'next/cache';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    const sig = headers().get('stripe-signature')!;
    const body = await req.text();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-06-20',
    });

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`?? Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            const userId = paymentIntent.metadata?.firebaseUID;
            const planId = paymentIntent.metadata?.planId;

            if (userId && planId) {
                console.log(`?? Payment Intent for ${paymentIntent.id} was successful. Updating subscription for user ${userId} to plan ${planId}.`);
                try {
                    const result = await updateUserSubscription(userId, planId);
                    if (!result.success) {
                         console.error(`?? Failed to update subscription in webhook:`, result.error);
                    }
                } catch(error) {
                    console.error('Error in updateUserSubscription from webhook:', error);
                }
            }
            break;
        case 'checkout.session.completed':
            // This case can still be useful for other checkout modes in the future,
            // but for embedded forms, payment_intent.succeeded is more reliable.
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`?? Checkout session ${session.id} completed.`);
            break;
        default:
            console.log(`?? Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
