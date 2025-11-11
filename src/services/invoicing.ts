
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { User, SubscriptionPlan, SubscriptionInvoice } from '@/lib/types';
import { sendInvoiceEmail } from '@/services/email';
import { Timestamp } from 'firebase-admin/firestore';

interface CreateInvoiceArgs {
    user: User;
    plan: SubscriptionPlan;
    paymentDetails: {
        provider: 'stripe' | 'razorpay';
        paymentId: string;
        amount: number; // Amount in smallest currency unit (e.g., cents)
        currency: string;
    }
}

async function getNextInvoiceNumber(): Promise<string> {
    const counterRef = adminDb.collection('internal').doc('invoiceCounter');
    const counterSnap = await counterRef.get();

    let nextNumber = 1001; // Start from 1001
    if (counterSnap.exists) {
        nextNumber = (counterSnap.data()?.lastNumber || 1000) + 1;
    }

    await counterRef.set({ lastNumber: nextNumber }, { merge: true });

    return `INV-${nextNumber}`;
}

export async function createSubscriptionInvoice(args: CreateInvoiceArgs): Promise<SubscriptionInvoice | null> {
    const { user, plan, paymentDetails } = args;

    try {
        if (!user.address) {
            throw new Error("Cannot generate invoice: User address is missing.");
        }

        const invoiceNumber = await getNextInvoiceNumber();
        const invoiceDate = new Date();

        const newInvoice: Omit<SubscriptionInvoice, 'id'> = {
            userId: user.uid,
            invoiceNumber: invoiceNumber,
            invoiceDate: invoiceDate.toISOString(),
            planName: plan.name,
            amount: paymentDetails.amount / 100, // Convert from cents to dollars for storage
            currency: paymentDetails.currency.toUpperCase(),
            status: 'paid',
            paymentId: paymentDetails.paymentId,
            provider: paymentDetails.provider,
            billedTo: {
                name: user.companyName || user.name,
                email: user.email,
                address: {
                    line1: user.address.street,
                    city: user.address.city,
                    state: user.address.state || null,
                    postal_code: user.address.zip,
                    country: user.address.country,
                }
            }
        };

        const invoiceRef = await adminDb.collection('subscriptionInvoices').add(newInvoice);

        console.log(`Successfully created invoice ${invoiceRef.id} for user ${user.uid}`);
        
        const finalInvoice: SubscriptionInvoice = {
            id: invoiceRef.id,
            ...newInvoice,
        }

        // Trigger email sending but don't block the response
        sendInvoiceEmail({ invoice: finalInvoice, user }).catch(err => {
            console.error("Error sending invoice email in background:", err);
        });

        return finalInvoice;

    } catch (error: any) {
        console.error("CRITICAL: Failed to create subscription invoice in database.", error);
        // We return null but don't re-throw the error, as the payment has already succeeded.
        // This should be monitored by logging/alerts in a production system.
        return null;
    }
}
