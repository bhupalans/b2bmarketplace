
// THIS FILE IS NO LONGER IN USE AND WILL BE REMOVED IN A FUTURE STEP.
// The new strategy uses a direct server-side confirmation action instead of a webhook.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    console.log("Stripe webhook received, but this handler is deprecated.");
    return NextResponse.json({ received: true, message: "This webhook is deprecated and no longer processed." });
}
