
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { getUser } from "@/lib/database";
import { createOffer, findOrCreateConversation, sendMessage } from "@/lib/firebase";
import type { Product, OfferSuggestion } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";

const inquirySchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters."),
});

export async function sendInquiryAction(
  prevState: any,
  formData: FormData
) {
    const validatedFields = inquirySchema.safeParse({
        message: formData.get('message'),
    });

    const idToken = formData.get('idToken') as string | null;
    
    if (!idToken) {
        return { success: false, error: "Authentication failed. Please log in again." };
    }

    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    
    const { message } = validatedFields.data;
    const sellerId = formData.get('sellerId') as string;
    const productJSON = formData.get('product') as string | undefined;

    if (!productJSON) {
        return { success: false, error: "Product information is missing." };
    }
    const product: Product = JSON.parse(productJSON);

    let buyerId: string;
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        buyerId = decodedToken.uid;
    } catch(error) {
        console.error("Authentication error in sendInquiryAction:", error);
        return { success: false, error: "Authentication failed. Please log in again." };
    }

    try {
        const { modifiedMessage } = await filterContactDetails({ message });

        const { conversationId } = await findOrCreateConversation({
            buyerId,
            sellerId,
            productId: product.id,
            productTitle: product.title,
            productImage: product.images[0] || '',
        });

        if (modifiedMessage.trim().length > 0) {
            await sendMessage(conversationId, buyerId, modifiedMessage);
        }
        
        return { success: true, conversationId: conversationId };

    } catch (error: any) {
        console.error("Error processing inquiry:", error);
        return { success: false, error: "There was a problem sending your inquiry." };
    }
}

export async function revalidateOffers() {
    revalidatePath('/messages');
}
