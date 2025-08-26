"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { mockProducts } from "@/lib/mock-data";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1),
});

export async function sendMessageAction(prevState: any, formData: FormData) {
  const validatedFields = messageSchema.safeParse({
    message: formData.get("message"),
  });

  if (!validatedFields.success) {
    return {
      ...prevState,
      error: "Message cannot be empty.",
    };
  }

  const originalMessage = validatedFields.data.message;
  const result = await filterContactDetails({ message: originalMessage });

  // Always succeed, but include the modification reason if there was one.
  return {
    error: null,
    modificationReason: result.modificationReason || null,
    message: {
      id: `msg-${Date.now()}`,
      text: result.modifiedMessage, // Use the (potentially modified) message
      timestamp: Date.now(),
      senderId: "user-1", // mock sender
      recipientId: "user-2",
    },
  };
}


const suggestionSchema = z.object({
  chatHistory: z.string(),
  sellerId: z.string(),
});

export async function suggestOfferAction(prevState: any, formData: FormData) {
  const validatedFields = suggestionSchema.safeParse({
    chatHistory: formData.get("chatHistory"),
    sellerId: formData.get("sellerId"),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid data for suggestion.",
    };
  }

  const { chatHistory, sellerId } = validatedFields.data;

  // In a real app, you'd query the DB for the seller's products.
  const availableProducts = mockProducts.filter(p => p.sellerId === sellerId);

  try {
    const suggestion = await suggestOffer({ 
      chatHistory, 
      availableProducts: availableProducts.map(({ id, title, priceUSD }) => ({ id, title, priceUSD }))
    });
    return {
      error: null,
      suggestion,
    };
  } catch (e: any) {
    console.error(e);
    return {
      error: "Failed to get AI suggestion. Please try again.",
      suggestion: null,
    }
  }
}
