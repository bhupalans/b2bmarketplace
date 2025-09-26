
'use server';

import { Resend } from 'resend';
import { User, Product, Question } from '@/lib/types';

if (!process.env.RESEND_API_KEY) {
    console.warn("Email service is not configured. RESEND_API_KEY is missing. Emails will not be sent.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const fromAddress = 'B2B Marketplace <notifications@b2btest.veloglobal.in>';

export async function sendQuestionAnsweredEmail({ buyer, product, question }: { buyer: User, product: Product, question: Question }) {
    if (!process.env.RESEND_API_KEY) return; // Don't try to send if not configured

    const productUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/products/${product.id}`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: buyer.email,
            subject: `Your question about "${product.title}" has been answered!`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${buyer.name},</h1>
                    <p>A seller has provided an answer to your question on the product: <strong>${product.title}</strong>.</p>
                    <hr>
                    <p style="color: #555;">Your question:</p>
                    <p style="font-style: italic;">"${question.text}"</p>
                    <p style="color: #555;">Seller's answer:</p>
                    <p style="font-weight: bold;">"${question.answer?.text}"</p>
                    <hr>
                    <p>
                        <a href="${productUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            View Answer on Product Page
                        </a>
                    </p>
                    <p><small>You are receiving this because you asked a question on the B2B Marketplace.</small></p>
                </div>
            `
        });
        console.log(`Answer notification email sent to ${buyer.email}`);
    } catch (error) {
        console.error(`Failed to send question answered email to ${buyer.email}:`, error);
        // In a production app, you might want to add more robust error handling or logging here.
    }
}
