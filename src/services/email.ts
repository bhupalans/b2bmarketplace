

'use server';

import { Resend } from 'resend';
import { User, Product, Question } from '@/lib/types';

const fromAddress = 'B2B Marketplace <notifications@b2btest.veloglobal.in>';

// Helper function to initialize Resend and check for API key
function getResend() {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Email service is not configured. RESEND_API_KEY is missing. Emails will not be sent.");
        return null;
    }
    return new Resend(process.env.RESEND_API_KEY);
}

export async function sendQuestionAnsweredEmail({ buyer, product, question }: { buyer: User, product: Product, question: Question }) {
    const resend = getResend();
    if (!resend) return;

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
    }
}

export async function sendProductApprovedEmail({ seller, product }: { seller: User, product: Product }) {
    const resend = getResend();
    if (!resend) return;

    const productUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/products/${product.id}`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: seller.email,
            subject: `Congratulations! Your product "${product.title}" has been approved.`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${seller.name},</h1>
                    <p>Great news! Your product submission, <strong>${product.title}</strong>, has been reviewed and approved by our team.</p>
                    <p>It is now live on the marketplace and visible to all buyers.</p>
                    <p>
                        <a href="${productUrl}" style="display: inline-block; padding: 10px 15px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            View Your Live Listing
                        </a>
                    </p>
                    <p><small>You are receiving this because you submitted a product on the B2B Marketplace.</small></p>
                </div>
            `
        });
        console.log(`Product approved email sent to ${seller.email}`);
    } catch (error) {
        console.error(`Failed to send product approved email to ${seller.email}:`, error);
    }
}

export async function sendProductRejectedEmail({ seller, product, reason }: { seller: User, product: Product, reason: string }) {
    const resend = getResend();
    if (!resend) return;

    const editProductUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/my-products`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: seller.email,
            subject: `Action Required: Your product submission "${product.title}"`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${seller.name},</h1>
                    <p>Your product submission, <strong>${product.title}</strong>, could not be approved at this time.</p>
                    <p style="color: #555;">Reason provided by our admin team:</p>
                    <p style="font-style: italic; border-left: 3px solid #dc3545; padding-left: 10px;">"${reason}"</p>
                    <p>Please review your product details, make the necessary corrections, and re-submit for approval.</p>
                    <p>
                        <a href="${editProductUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            Go to My Products
                        </a>
                    </p>
                    <p><small>You are receiving this because you submitted a product on the B2B Marketplace.</small></p>
                </div>
            `
        });
        console.log(`Product rejected email sent to ${seller.email}`);
    } catch (error) {
        console.error(`Failed to send product rejected email to ${seller.email}:`, error);
    }
}

export async function sendUserVerifiedEmail({ user }: { user: Partial<User> }) {
    const resend = getResend();
    if (!resend || !user.email) return;

    const profileUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/profile`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject: `Congratulations! Your account has been verified.`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${user.name},</h1>
                    <p>Great news! Your account on the B2B Marketplace has been successfully verified.</p>
                    <p>You now have access to all marketplace features, including contacting sellers and buyers. This verified status will be displayed on your profile to build trust within the community.</p>
                    <p>
                        <a href="${profileUrl}" style="display: inline-block; padding: 10px 15px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            View Your Profile
                        </a>
                    </p>
                    <p><small>You are receiving this because you submitted your details for verification on the B2B Marketplace.</small></p>
                </div>
            `
        });
        console.log(`User verified email sent to ${user.email}`);
    } catch (error) {
        console.error(`Failed to send user verified email to ${user.email}:`, error);
    }
}

export async function sendUserRejectedEmail({ user, reason }: { user: Partial<User>, reason: string }) {
    const resend = getResend();
    if (!resend || !user.email) return;

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/profile/verification`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject: `Action Required: Your account verification`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${user.name},</h1>
                    <p>We've reviewed your verification submission, but unfortunately, we could not approve it at this time.</p>
                    <p style="color: #555;">Reason provided by our admin team:</p>
                    <p style="font-style: italic; border-left: 3px solid #dc3545; padding-left: 10px;">"${reason}"</p>
                    <p>Please review the feedback, make the necessary corrections to your documents or profile information, and re-submit for approval.</p>
                    <p>
                        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            Return to Verification Center
                        </a>
                    </p>
                    <p><small>You are receiving this because you submitted your details for verification on the B2B Marketplace.</small></p>
                </div>
            `
        });
        console.log(`User rejected email sent to ${user.email}`);
    } catch (error) {
        console.error(`Failed to send user rejected email to ${user.email}:`, error);
    }
}
