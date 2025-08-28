
"use server";

import { filterContactDetails } from "@/ai/flows/filter-contact-details";
import { suggestOffer } from "@/ai/flows/suggest-offer";
import { db } from "@/lib/firebase";
import { createOrUpdateProduct, deleteProduct, getProduct, getSellerProducts, getUser } from "@/lib/firestore";
import { Product } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminApp, adminAuth } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { Resend } from 'resend';

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

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL;

    if (!fromEmail) {
        console.error("FROM_EMAIL environment variable is not set.");
        return { success: false, error: "Server configuration error." };
    }

    const seller = await getUser(sellerId);
    if (!seller) {
        return { success: false, error: "Seller not found." };
    }

    try {
        await resend.emails.send({
            from: fromEmail,
            to: seller.email,
            subject: `New Inquiry for ${productTitle || 'your products'} via B2B Marketplace`,
            html: `<p>You have received a new inquiry from <strong>${buyerName}</strong> (${buyerEmail}).</p>
                   <p><strong>Product:</strong> ${productTitle || 'General Inquiry'}</p>
                   <p><strong>Message:</strong></p>
                   <p>${message}</p>`,
            reply_to: buyerEmail,
        });

        return { success: true };
    } catch (error) {
        console.error("Resend API error:", error);
        return { success: false, error: "Could not send inquiry. Please try again later." };
    }
}


const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  description: z.string().min(10),
  priceUSD: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  images: z.array(z.string().url()).min(1),
});

const productActionSchema = z.object({
    productData: productSchema,
    idToken: z.string(),
});

async function getAuthenticatedUserUid(idToken: string): Promise<string> {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
         console.error("Error verifying ID token:", error);
         throw new Error('User not authenticated');
    }
}

export async function createOrUpdateProductAction(values: z.infer<typeof productActionSchema>) {
  let sellerId: string;
  try {
    sellerId = await getAuthenticatedUserUid(values.idToken);
  } catch (error: any) {
    console.error("Authentication error:", error.message);
    return { success: false, error: 'User not authenticated' };
  }

  const { ...productDataWithoutSeller } = values.productData;

  try {
    const finalProductData: Omit<Product, 'id'> = {
      ...productDataWithoutSeller,
      sellerId,
    };
    
    const savedProduct = await createOrUpdateProduct(finalProductData, values.productData.id);

    revalidatePath('/');
    revalidatePath(`/products/${savedProduct.id}`);
    revalidatePath(`/sellers/${sellerId}`);
    revalidatePath('/my-products');

    return { success: true, product: savedProduct };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const deleteActionSchema = z.object({
    productId: z.string(),
    idToken: z.string(),
});

export async function deleteProductAction(values: z.infer<typeof deleteActionSchema>) {
    let sellerId: string;
    try {
        sellerId = await getAuthenticatedUserUid(values.idToken);
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

const signedUrlSchema = z.object({
    fileName: z.string(),
    fileType: z.string(),
    idToken: z.string(),
});

export async function getSignedUploadUrlAction(values: z.infer<typeof signedUrlSchema>) {
    let userId: string;
    try {
        userId = await getAuthenticatedUserUid(values.idToken);
    } catch(error: any) {
        return { success: false, error: 'User not authenticated.', url: null, finalFilePath: null };
    }

    const bucket = getAdminApp().storage().bucket();
    const finalFilePath = `products/${userId}/${uuidv4()}-${values.fileName}`;
    const file = bucket.file(finalFilePath);

    const expires = Date.now() + 60 * 5 * 1000; // 5 minutes

    try {
        const [url] = await file.getSignedUrl({
            action: 'write',
            expires,
            contentType: values.fileType,
            version: 'v4',
        });
        return { success: true, url, finalFilePath };
    } catch (error: any) {
        console.error("Error getting signed URL:", error);
        return { success: false, error: 'Could not get upload URL.', url: null, finalFilePath: null };
    }
}
