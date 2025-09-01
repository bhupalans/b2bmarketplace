
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { findOrCreateConversation, sendMessage } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";

const inquirySchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters."),
});

export async function sendInquiryAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; error: string | null; conversationId: string | null }> {
    const validatedFields = inquirySchema.safeParse({
        message: formData.get('message'),
    });

    const idToken = formData.get('idToken') as string | null;
    
    if (!idToken) {
        return { success: false, error: "Authentication failed. Please log in again.", conversationId: null };
    }

    if (!validatedFields.success) {
        const errorMessage = validatedFields.error.errors.map(e => e.message).join(', ');
        return { success: false, error: errorMessage, conversationId: null };
    }
    
    const { message } = validatedFields.data;
    const sellerId = formData.get('sellerId') as string;
    const productJSON = formData.get('product') as string;
    
    if (!sellerId || !productJSON) {
        return { success: false, error: "Product or seller information is missing.", conversationId: null };
    }

    const product: Product = JSON.parse(productJSON);

    let buyerId: string;
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        buyerId = decodedToken.uid;
    } catch(error) {
        console.error("Authentication error in sendInquiryAction:", error);
        return { success: false, error: "Authentication failed. Please log in again.", conversationId: null };
    }

    try {
        const { conversationId } = await findOrCreateConversation({
            buyerId,
            sellerId,
            productId: product.id,
            productTitle: product.title,
            productImage: product.images[0] || '',
        });
        
        // This now correctly calls sendMessage, which contains the AI filtering logic
        await sendMessage(conversationId, buyerId, message);
        
        revalidatePath('/messages');
        return { success: true, error: null, conversationId: conversationId };

    } catch (error: any) {
        console.error("Error processing inquiry:", error);
        return { success: false, error: "There was a problem sending your inquiry.", conversationId: null };
    }
}

export async function revalidateOffers() {
    revalidatePath('/messages');
}
