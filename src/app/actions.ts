
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { getUser } from "@/lib/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";

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

    // This is a server action, so we can securely get the user's ID token from headers
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
        return { success: false, error: "Authentication failed. Please log in again." };
    }

    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    
    const { message } = validatedFields.data;
    const sellerId = formData.get('sellerId') as string;
    const productTitle = formData.get('productTitle') as string | undefined;

    let buyerId: string;
    let buyerName: string;

    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        buyerId = decodedToken.uid;
        const buyer = await getUser(buyerId);
        if (!buyer) throw new Error("Buyer profile not found.");
        buyerName = buyer.name;
    } catch(error) {
        console.error("Authentication error in sendInquiryAction:", error);
        return { success: false, error: "Authentication failed. Please log in again." };
    }

    try {
        const { modifiedMessage, modificationReason } = await filterContactDetails({ message });

        // The actual sending logic (e.g., creating a message thread in Firestore) is not implemented.
        // For now, we just log the filtered inquiry to the console to demonstrate the AI filter works.
        console.log("Filtered Inquiry received:", { 
            buyerName, 
            sellerId, 
            productTitle,
            originalMessage: message,
            modifiedMessage,
            modificationReason,
        });
        
        return { success: true, message: "Inquiry sent successfully!" };
    } catch (error: any) {
        console.error("Error processing inquiry:", error);
        return { success: false, error: "There was a problem sending your inquiry." };
    }
}

// NOTE: The product creation/update and deletion logic has been moved to client-side
// functions in `src/lib/firebase.ts` to resolve server-side authentication issues.
// The corresponding server actions have been removed to prevent their use.
// We are keeping this file for the `sendInquiryAction` and for potential future actions.
