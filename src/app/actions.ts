
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
  buyerName: z.string().min(1, "Name is required."),
  buyerEmail: z.string().email("A valid email is required."),
  message: z.string().min(10, "Message must be at least 10 characters."),
  sellerId: z.string(),
  productId: z.string().optional(),
  productTitle: z.string().optional(),
});

export async function sendInquiryAction(values: z.infer<typeof inquirySchema>) {
    const validatedFields = inquirySchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid data." };
    }
    
    const { buyerName, buyerEmail, message, sellerId, productTitle } = validatedFields.data;

    // NOTE: Email sending functionality has been temporarily disabled.
    // In a real application, you would use a service like Resend or SendGrid here.
    console.log("Inquiry received:", { buyerName, buyerEmail, message, sellerId, productTitle });
    
    // Simulate a successful send without actually sending an email.
    return { success: true };
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

    const finalProductData: Omit<Product, 'id'> = {
      ...productData,
      images: allImageUrls,
      sellerId: sellerId, // Use the verified sellerId
    };
    
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
