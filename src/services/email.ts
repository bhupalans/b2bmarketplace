
'use server';

import { Resend } from 'resend';
import { User, Product, Question, SubscriptionInvoice, SourcingRequest, CallbackRequest } from '@/lib/types';
import { format } from 'date-fns';

const fromAddress = 'B2B Marketplace <notifications@b2btest.veloglobal.in>';
const adminEmail = 'admin@b2b.com';

// Helper function to initialize Resend and check for API key
function getResend() {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Email service is not configured. RESEND_API_KEY is missing. Emails will not be sent.");
        return null;
    }
    return new Resend(process.env.RESEND_API_KEY);
}

export async function sendCallbackRequestEmail(requestData: Omit<CallbackRequest, 'id'>) {
    const resend = getResend();
    if (!resend) return;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: adminEmail,
            subject: `New Callback Request from ${requestData.name}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>New Callback Request Received</h1>
                    <p>A user has requested a callback from the contact page.</p>
                    <ul>
                        <li><strong>Name:</strong> ${requestData.name}</li>
                        <li><strong>Company:</strong> ${requestData.companyName}</li>
                        <li><strong>Role:</strong> ${requestData.role}</li>
                        <li><strong>Country:</strong> ${requestData.country}</li>
                        <li><strong>Phone:</strong> ${requestData.phoneNumber}</li>
                        <li><strong>Preferred Time:</strong> ${requestData.preferredTime}</li>
                    </ul>
                </div>
            `
        });
        console.log(`Callback request email sent for ${requestData.name}`);
    } catch (error) {
        console.error(`Failed to send callback request email:`, error);
    }
}

export async function sendSourcingRequestSubmittedEmail({ request, buyer, isUpdate = false }: { request: { id: string, title: string }, buyer: User, isUpdate?: boolean }) {
    const resend = getResend();
    if (!resend) return;

    const adminApprovalUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/sourcing-approvals`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: adminEmail,
            subject: isUpdate ? `Sourcing Request Updated and Pending Review: "${request.title}"` : `New Sourcing Request Pending Review: "${request.title}"`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Sourcing Request Requires Review</h1>
                    <p>A buyer, ${buyer.name} (${buyer.email}), has ${isUpdate ? 'updated' : 'submitted'} a sourcing request that requires your approval.</p>
                    <p><strong>Request Title:</strong> ${request.title}</p>
                    <p><strong>Buyer:</strong> ${buyer.name}</p>
                    <p>
                        <a href="${adminApprovalUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            Go to Admin Approvals
                        </a>
                    </p>
                </div>
            `
        });
        console.log(`Admin notification email sent for sourcing request ${request.id}`);
    } catch (error) {
        console.error(`Failed to send admin notification for sourcing request:`, error);
    }
}


export async function sendSourcingRequestApprovedEmail({ requestId, requestTitle, buyer }: { requestId: string, requestTitle: string, buyer: User }) {
    const resend = getResend();
    if (!resend || !buyer.email) return;

    const requestUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/sourcing/${requestId}`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: buyer.email,
            subject: `Your sourcing request "${requestTitle}" is now live!`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${buyer.name},</h1>
                    <p>Great news! Your sourcing request, <strong>${requestTitle}</strong>, has been approved and is now visible to all sellers on the marketplace.</p>
                    <p>You should start receiving quotes and messages from interested suppliers soon.</p>
                    <p>
                        <a href="${requestUrl}" style="display: inline-block; padding: 10px 15px; background-color: #28a745; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            View Your Live Request
                        </a>
                    </p>
                </div>
            `
        });
        console.log(`Sourcing request approved email sent to ${buyer.email}`);
    } catch (error) {
        console.error(`Failed to send sourcing request approved email to ${buyer.email}:`, error);
    }
}

export async function sendSourcingRequestRejectedEmail({ requestId, requestTitle, buyer, reason }: { requestId: string, requestTitle: string, buyer: User, reason: string }) {
    const resend = getResend();
    if (!resend || !buyer.email) return;

    const editRequestUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/sourcing/create?id=${requestId}`;

    try {
        await resend.emails.send({
            from: fromAddress,
            to: buyer.email,
            subject: `Action Required: Your sourcing request "${requestTitle}"`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                    <h1>Hi ${buyer.name},</h1>
                    <p>Your sourcing request, <strong>${requestTitle}</strong>, could not be approved at this time.</p>
                    <p style="color: #555;">Reason provided by our admin team:</p>
                    <p style="font-style: italic; border-left: 3px solid #dc3545; padding-left: 10px;">"${reason}"</p>
                    <p>Please review your request, make the necessary corrections, and re-submit for approval.</p>
                    <p>
                        <a href="${editRequestUrl}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">
                            Edit Your Request
                        </a>
                    </p>
                </div>
            `
        });
        console.log(`Sourcing request rejected email sent to ${buyer.email}`);
    } catch (error) {
        console.error(`Failed to send sourcing request rejected email to ${buyer.email}:`, error);
    }
}

export async function sendInvoiceEmail({ invoice, user }: { invoice: SubscriptionInvoice, user: User }) {
    const resend = getResend();
    if (!resend || !user.email) return;

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: invoice.currency,
    }).format(invoice.amount);

    const invoiceDate = format(new Date(invoice.invoiceDate), 'PPP');

    try {
        await resend.emails.send({
            from: fromAddress,
            to: user.email,
            subject: `Your B2B Marketplace Invoice #${invoice.invoiceNumber}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                    <h1 style="font-size: 24px; color: #333;">Invoice</h1>
                    <p>Hi ${user.name},</p>
                    <p>Thank you for your payment. Here is your invoice for your recent subscription purchase.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${invoiceDate}</td>
                        </tr>
                        <tr style="background-color: #f9f9f9;">
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Item</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;"><strong>Amount</strong></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">Yearly Subscription: ${invoice.planName} Plan</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formattedAmount}</td>
                        </tr>
                        <tr style="font-weight: bold;">
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formattedAmount}</td>
                        </tr>
                    </table>
                    <p>You can view all your past invoices by visiting your profile on the marketplace.</p>
                    <p style="font-size: 12px; color: #777;">This is an automated email. Please do not reply.</p>
                </div>
            `
        });
        console.log(`Invoice email sent to ${user.email} for invoice #${invoice.invoiceNumber}`);
    } catch (error) {
        console.error(`Failed to send invoice email to ${user.email}:`, error);
    }
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
