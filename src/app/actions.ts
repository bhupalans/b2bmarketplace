
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { createOrUpdateProduct, deleteProduct, getProduct, getUser } from "@/lib/database";
import { Product } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAuth, adminStorage } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
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

export async function createOrUpdateProductAction(formData: FormData) {
  let sellerId: string;
  try {
    const idToken = formData.get('idToken') as string;
    if (!idToken) throw new Error('No ID token provided.');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    sellerId = decodedToken.uid;
  } catch (error: any) {
    console.error("Authentication error:", error.message);
    return { success: false, error: 'User not authenticated' };
  }
  
  const productId = formData.get('id') as string | undefined;
  const existingImageUrls = formData.getAll('existingImages[]').filter(url => typeof url === 'string') as string[];

  const productData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priceUSD: parseFloat(formData.get('priceUSD') as string),
      categoryId: formData.get('categoryId') as string,
  };

  const newImageFiles = formData.getAll('newImages') as File[];
  const uploadedImageUrls: string[] = [];

  const bucket = adminStorage.bucket();

  try {
    for (const file of newImageFiles) {
        if (file.size === 0) continue; 
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const finalFilePath = `products/${sellerId}/${uuidv4()}-${file.name}`;
        const fileUpload = bucket.file(finalFilePath);

        await fileUpload.save(fileBuffer, {
            metadata: {
                contentType: file.type,
            },
        });
        
        await fileUpload.makePublic();
        uploadedImageUrls.push(fileUpload.publicUrl());
    }

    const allImageUrls = [...existingImageUrls, ...uploadedImageUrls];
    
    if (allImageUrls.length === 0) {
        return { success: false, error: 'At least one image is required.' };
    }

    const finalProductData: Omit<Product, 'id' | 'status'> & { status?: Product['status'] } = {
      ...productData,
      images: allImageUrls,
      sellerId: sellerId,
    };
    
    // Set status to 'pending' only for new products
    if (!productId) {
      finalProductData.status = 'pending';
    }

    const savedProduct = await createOrUpdateProduct(finalProductData, productId);

    revalidatePath('/');
    revalidatePath(`/products/${savedProduct.id}`);
    revalidatePath(`/sellers/${sellerId}`);
    revalidatePath('/my-products');

    return { success: true, product: savedProduct };
  } catch (error: any) {
    console.error("Error in createOrUpdateProductAction:", error);
    return { success: false, error: error.message || 'An unknown error occurred during product creation.' };
  }
}

const deleteActionSchema = z.object({
    productId: z.string(),
    idToken: z.string(),
});

export async function deleteProductAction(values: z.infer<typeof deleteActionSchema>) {
    let sellerId: string;
    try {
        const decodedToken = await adminAuth.verifyIdToken(values.idToken);
        sellerId = decodedToken.uid;
    } catch(error: any) {
        return { success: false, error: 'User not authenticated' };
    }
    
    const product = await getProduct(values.productId);
    if (!product || product.sellerId !== sellerId) {
        return { success: false, error: 'Permission denied or product not found' };
    }

    const bucket = adminStorage.bucket();

    // Delete images from Firebase Storage
    for (const imageUrl of product.images) {
        try {
            const url = new URL(imageUrl);
            const path = decodeURIComponent(url.pathname.split('/').slice(3).join('/'));
            await bucket.file(path).delete();
        } catch (storageError: any) {
            // Log the error but don't block the product deletion
            console.error(`Failed to delete image ${imageUrl} from storage:`, storageError.message);
        }
    }

    try {
        await deleteProduct(values.productId);
        
        revalidatePath('/');
        revalidatePath(`/sellers/${sellerId}`);
        revalidatePath('/my-products');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
