
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { getUser } from "@/lib/database";
import { createOffer, startConversation } from "@/lib/firebase";
import type { Product, Offer } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
        // This is not ideal for server-side validation. We'll improve this later.
        // For now, it prevents saving invalid data.
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
        // First, filter the message content for any policy violations
        const { modifiedMessage, modificationReason } = await filterContactDetails({ message });

        // If a reason is returned, it means the message was modified.
        // We can choose to show this to the user later.
        // For now, we proceed with the modified (safe) message.
        
        const conversationId = await startConversation({
            buyerId,
            sellerId,
            productId: product.id,
            productTitle: product.title,
            productImage: product.images[0] || '',
            initialMessageText: modifiedMessage,
        });
        
        // Instead of returning state, we redirect to the new conversation
        // This provides a better user experience.
        return { success: true, conversationId: conversationId };

    } catch (error: any) {
        console.error("Error processing inquiry:", error);
        return { success: false, error: "There was a problem sending your inquiry." };
    }
}

const createOfferSchema = z.object({
  productId: z.string().min(1, { message: "Please select a product." }),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive." }),
  pricePerUnit: z.coerce.number().positive({ message: "Price must be positive." }),
  notes: z.string().optional(),
  conversationId: z.string().min(1),
  buyerId: z.string().min(1),
  sellerId: z.string().min(1),
});

export async function createOfferAction(values: unknown) {
    const validatedFields = createOfferSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error("Offer validation failed:", validatedFields.error.flatten().fieldErrors);
        return { success: false, error: "Invalid data provided." };
    }
    
    try {
        const offer = await createOffer(validatedFields.data);
        revalidatePath(`/messages/${validatedFields.data.conversationId}`);
        return { success: true, offer };
    } catch (error: any) {
        console.error("Error creating offer:", error);
        return { success: false, error: error.message || "Failed to create offer." };
    }
}

// Re-enabling revalidatePath for offer suggestions in a later step
export async function revalidateOffers() {
    revalidatePath('/messages');
}
