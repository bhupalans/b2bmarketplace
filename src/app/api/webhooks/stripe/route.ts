
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { updateUserSubscription } from '@/app/user-actions';

// This is your Stripe CLI webhook secret for testing your endpoint locally.
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
        console.error(`??  Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            
            const userId = session.metadata?.firebaseUID;
            const planId = session.metadata?.planId;

            if (session.payment_status === 'paid' && userId && planId) {
                console.log(`??  Payment for session ${session.id} was successful. Updating subscription for user ${userId} to plan ${planId}.`);
                
                try {
                    const result = await updateUserSubscription(userId, planId);
                    if (!result.success) {
                         console.error(`??  Failed to update subscription in webhook:`, result.error);
                         // We can't easily retry from here, but logging is crucial.
                         // For a production app, you'd queue this for a retry.
                    }
                } catch(error) {
                    console.error('Error in updateUserSubscription from webhook:', error);
                }
            }
            break;
        default:
            console.log(`??  Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

// Note: You must disable the body parser for this route
// as Stripe requires the raw body to verify the signature.
export const config = {
    api: {
        bodyParser: false,
    },
};
