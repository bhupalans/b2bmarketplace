
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { loggedInUser, mockOffers, mockProducts, mockUsers } from "@/lib/mock-data";
import { Offer } from "@/lib/types";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1),
  offer: z.string().optional(), // Stringified JSON of the new offer
  recipientId: z.string().optional(), // Who the offer is for
  offerDecision: z.string().optional(), // Stringified JSON of the offer decision
});

export async function sendMessageAction(prevState: any, formData: FormData) {
  const validatedFields = messageSchema.safeParse({
    message: formData.get("message"),
    offer: formData.get("offer") as string | undefined,
    recipientId: formData.get("recipientId") as string | undefined,
    offerDecision: formData.get("offerDecision") as string | undefined,
  });

  if (!validatedFields.success) {
    return {
      ...prevState,
      error: "Message cannot be empty.",
    };
  }

  // Handle updating an offer and creating a system message
  if (validatedFields.data.offerDecision) {
    const { offerId, decision, productTitle } = JSON.parse(validatedFields.data.offerDecision);
    const offer = mockOffers[offerId];
    if (offer) {
      offer.status = decision;
    }
    return {
      error: null,
      message: {
        id: `msg-${Date.now()}`,
        text: `Offer ${decision}: ${productTitle}`,
        timestamp: Date.now(),
        senderId: loggedInUser.id,
        recipientId: offer.sellerId,
        isSystemMessage: true, // Flag for styling
      }
    };
  }


  // Handle creating a new offer
  if (validatedFields.data.offer && validatedFields.data.recipientId) {
    const offerData = JSON.parse(validatedFields.data.offer) as Omit<Offer, 'id' | 'status' | 'sellerId' | 'buyerId'>;
    const newOffer: Offer = {
      ...offerData,
      id: `offer-${Date.now()}`,
      status: 'pending',
      sellerId: loggedInUser.id,
      buyerId: validatedFields.data.recipientId,
    };
    
    // In a real app, you'd save this to a database.
    mockOffers[newOffer.id] = newOffer;

    const product = mockProducts.find(p => p.id === newOffer.productId);

    // Return a new message that contains the offer
    return {
      error: null,
      message: {
        id: `msg-${Date.now()}`,
        text: `Offer created for ${product?.title}`, // This text isn't displayed but good for context
        timestamp: Date.now(),
        senderId: loggedInUser.id, 
        recipientId: validatedFields.data.recipientId,
        offerId: newOffer.id,
      }
    }
  }


  // Handle standard text messages
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
      senderId: loggedInUser.id, // mock sender
      recipientId: mockUsers['user-1'].id, // Hardcoded for demo
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
