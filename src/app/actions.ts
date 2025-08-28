
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { db } from "@/lib/firebase";
import { createOrUpdateProduct, deleteProduct, getProduct, getUsers } from "@/lib/firestore";
import { mockOffers, mockProducts } from "@/lib/mock-data";
import { Message, Offer, Product } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminApp, adminAuth } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { headers } from "next/headers";

const messageSchema = z.object({
  message: z.string().min(1, { message: "Message cannot be empty." }),
  offer: z.string().optional(), // Stringified JSON of the new offer
  recipientId: z.string().min(1, { message: "Recipient is required."}),
  senderId: z.string().min(1, { message: "Sender is required."}),
});

export async function sendMessageAction(data: { message: string, recipientId: string, senderId: string, offer?: string }) {
  const validatedFields = messageSchema.safeParse(data);

  if (!validatedFields.success) {
    const error = validatedFields.error.flatten().fieldErrors.message?.[0] 
      || validatedFields.error.flatten().fieldErrors.recipientId?.[0]
      || "Validation failed.";
    return {
      error,
      message: null,
      modificationReason: null,
    };
  }
  
  const { recipientId, message: originalMessage, offer: offerString, senderId } = validatedFields.data;

  // Handle creating a new offer
  if (offerString) {
    const offerData = JSON.parse(offerString) as Omit<Offer, 'id' | 'status' | 'sellerId' | 'buyerId'>;
    const newOffer: Offer = {
      ...offerData,
      id: `offer-${Date.now()}`,
      status: 'pending',
      sellerId: senderId,
      buyerId: recipientId,
    };
    
    // In a real app, you'd save this to a database.
    mockOffers[newOffer.id] = newOffer;

    const product = mockProducts.find(p => p.id === newOffer.productId);
    const offerMessage = `Offer created for ${product?.title}`;

    const messageDoc: Omit<Message, 'id' | 'timestamp'> = {
      text: offerMessage,
      senderId: senderId,
      recipientId: recipientId,
      participants: [senderId, recipientId].sort(),
      offerId: newOffer.id,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'messages'), messageDoc);

    return {
      error: null,
      modificationReason: null,
      message: {
        id: docRef.id,
        ...messageDoc,
        timestamp: Date.now(), // Use client-side timestamp for immediate display
      }
    }
  }


  // Handle standard text messages
  const filterResult = await filterContactDetails({ message: originalMessage });

  const newMessage: Omit<Message, 'id' | 'timestamp'> = {
      text: filterResult.modifiedMessage, // Use the (potentially modified) message
      senderId: senderId,
      recipientId: recipientId,
      participants: [senderId, recipientId].sort(),
      timestamp: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, 'messages'), newMessage);
    
    return {
      error: null,
      modificationReason: filterResult.modificationReason || null,
      message: {
        id: docRef.id,
        ...newMessage,
        timestamp: Date.now(), // Use client-side timestamp for immediate UI update
      },
    };

  } catch (error) {
    console.error("Error saving message:", error);
    return { error: "Failed to save message to the database.", message: null, modificationReason: null };
  }
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


const offerDecisionSchema = z.object({
  offerId: z.string(),
  decision: z.enum(['accepted', 'declined']),
});

// A new, dedicated server action for handling offer decisions.
export async function decideOnOfferAction(formData: FormData) {
  const validatedFields = offerDecisionSchema.safeParse({
    offerId: formData.get('offerId'),
    decision: formData.get('decision'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid offer decision data.' };
  }
  
  const { offerId, decision } = validatedFields.data;
  const offer = mockOffers[offerId];
  
  if (offer) {
    offer.status = decision;
    
    const product = mockProducts.find(p => p.id === offer.productId);

    // This creates the system message.
    const systemMessage: Omit<Message, 'id' | 'timestamp'> = {
      text: `Offer ${decision}: ${product?.title}`,
      senderId: 'system',
      recipientId: offer.sellerId, // The recipient here is arbitrary for system messages
      participants: [offer.buyerId, offer.sellerId].sort(),
      isSystemMessage: true, 
      timestamp: serverTimestamp(),
    };
    
    // Save system message to Firestore
    await addDoc(collection(db, 'messages'), systemMessage);
    
    // No revalidation needed due to real-time listener
    // revalidatePath('/messages');
    return { success: true };
  }

  return { error: 'Offer not found.' };
}


const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  priceUSD: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  images: z.array(z.string().url()).min(1),
});

async function getAuthenticatedUserUid(): Promise<string> {
    const authorization = headers().get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    }
    throw new Error('User not authenticated.');
}

export async function createOrUpdateProductAction(values: z.infer<typeof productSchema>) {
  let sellerId: string;
  try {
    sellerId = await getAuthenticatedUserUid();
  } catch (error: any) {
    console.error("Authentication error:", error.message);
    return { success: false, error: 'User not authenticated' };
  }

  const { ...productDataWithoutSeller } = values;

  try {
    const productData: Omit<Product, 'id'> = {
      ...productDataWithoutSeller,
      sellerId,
    };
    
    const savedProduct = await createOrUpdateProduct(productData, values.id);

    // Revalidate paths to update caches
    revalidatePath('/');
    revalidatePath(`/products/${savedProduct.id}`);
    revalidatePath(`/sellers/${sellerId}`);
    revalidatePath('/my-products');

    return { success: true, product: savedProduct };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProductAction(productId: string) {
    let sellerId: string;
    try {
        sellerId = await getAuthenticatedUserUid();
    } catch(error: any) {
        return { success: false, error: 'User not authenticated' };
    }
    
    // Optional: Verify the user owns the product before deleting
    const product = await getProduct(productId);
    if (!product || product.sellerId !== sellerId) {
        return { success: false, error: 'Permission denied or product not found' };
    }

    try {
        await deleteProduct(productId);
        
        revalidatePath('/');
        revalidatePath(`/sellers/${sellerId}`);
        revalidatePath('/my-products');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getSignedUploadUrlAction(fileName: string, fileType: string) {
    let userId: string;
    try {
        userId = await getAuthenticatedUserUid();
    } catch(error: any) {
        return { success: false, error: 'User not authenticated', url: null, finalFilePath: null };
    }

    const adminApp = getAdminApp();
    const bucket = adminApp.storage().bucket();
    const finalFilePath = `products/${userId}/${uuidv4()}-${fileName}`;
    const file = bucket.file(finalFilePath);

    const expires = Date.now() + 60 * 5 * 1000; // 5 minutes

    try {
        const [url] = await file.getSignedUrl({
            action: 'write',
            expires,
            contentType: fileType,
            version: 'v4',
        });
        return { success: true, url, finalFilePath };
    } catch (error: any) {
        console.error("Error getting signed URL:", error);
        return { success: false, error: 'Could not get upload URL.', url: null, finalFilePath: null };
    }
}
