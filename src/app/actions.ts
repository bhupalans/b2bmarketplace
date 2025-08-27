
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { auth, storage } from "@/lib/firebase";
import { createOrUpdateProduct, deleteProduct, getProduct } from "@/lib/firestore";
import { mockOffers, mockProducts, mockUsers } from "@/lib/mock-data";
import { Offer, Product } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

const messageSchema = z.object({
  message: z.string().min(1),
  offer: z.string().optional(), // Stringified JSON of the new offer
  recipientId: z.string().optional(), // Who the offer is for
});

export async function sendMessageAction(prevState: any, formData: FormData) {
  const validatedFields = messageSchema.safeParse({
    message: formData.get("message"),
    offer: formData.get("offer") as string | undefined,
    recipientId: formData.get("recipientId") as string | undefined,
  });

  if (!validatedFields.success) {
    return {
      ...prevState,
      error: "Message cannot be empty.",
    };
  }

  const senderId = auth.currentUser?.uid;
  if (!senderId) {
    return { error: "User not authenticated." };
  }
  
  // Handle creating a new offer
  if (validatedFields.data.offer && validatedFields.data.recipientId) {
    const offerData = JSON.parse(validatedFields.data.offer) as Omit<Offer, 'id' | 'status' | 'sellerId' | 'buyerId'>;
    const newOffer: Offer = {
      ...offerData,
      id: `offer-${Date.now()}`,
      status: 'pending',
      sellerId: senderId,
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
        senderId: senderId, 
        recipientId: validatedFields.data.recipientId,
        offerId: newOffer.id,
      }
    }
  }


  // Handle standard text messages
  const originalMessage = validatedFields.data.message;
  const result = await filterContactDetails({ message: originalMessage });

  // In a real app, you'd have a way to determine the recipient
  const recipientId = Object.keys(mockUsers).find(id => id !== senderId && id !== 'system');
  if (!recipientId) {
      return { error: "Could not determine recipient." };
  }

  // Always succeed, but include the modification reason if there was one.
  return {
    error: null,
    modificationReason: result.modificationReason || null,
    message: {
      id: `msg-${Date.now()}`,
      text: result.modifiedMessage, // Use the (potentially modified) message
      timestamp: Date.now(),
      senderId: senderId,
      recipientId: recipientId,
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

    // This creates the system message. In a real app, you'd save this to a DB.
    const systemMessage = {
      id: `msg-${Date.now()}`,
      text: `Offer ${decision}: ${product?.title}`,
      timestamp: Date.now(),
      senderId: 'system',
      recipientId: offer.sellerId,
      isSystemMessage: true, 
    };

    // This is a placeholder for where you would push the new message to a real-time system.
    // For now, we rely on revalidating the path to show the new status.
    console.log("New system message created:", systemMessage);
    
    revalidatePath('/messages');
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
  sellerId: z.string(),
});

export async function createOrUpdateProductAction(values: z.infer<typeof productSchema>) {
  if (!values.sellerId) {
    return { success: false, error: 'User not authenticated' };
  }
  const { sellerId, ...productDataWithoutSeller } = values;

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

export async function deleteProductAction(productId: string, sellerId: string) {
    if (!sellerId) {
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


export async function uploadImagesAction(formData: FormData) {
  const files = formData.getAll('files') as File[];
  const sellerId = formData.get('sellerId') as string;

  if (!sellerId) {
    return { success: false, error: "User not authenticated. Please ensure you are logged in." };
  }
  if (!files || files.length === 0) {
    return { success: false, error: "No files provided." };
  }

  const uploadPromises = files.map(async (file) => {
    try {
      const fileId = uuidv4();
      const storageRef = ref(storage, `product-images/${sellerId}/${fileId}-${file.name}`);
      
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const snapshot = await uploadBytes(storageRef, buffer, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error(`Failed to upload ${file.name}:`, error);
      // Return a specific object for failed uploads
      return { error: `Failed to upload ${file.name}`, fileName: file.name };
    }
  });

  const results = await Promise.all(uploadPromises);

  const uploadedUrls = results.filter(result => typeof result === 'string') as string[];
  const uploadErrors = results.filter(result => typeof result === 'object' && result.error);

  if (uploadErrors.length > 0) {
    return { 
      success: false, 
      error: `Could not upload ${uploadErrors.length} file(s).`,
      urls: uploadedUrls,
      errors: uploadErrors
    };
  }

  return { success: true, urls: uploadedUrls };
}
