
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { headers } from "next/headers";
import { adminAuth } from '@/lib/firebase-admin';
import { getUser, updateProductStatus } from '@/lib/database';

const productActionSchema = z.object({
    productId: z.string(),
});

async function verifyAdmin() {
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        throw new Error("Authentication failed: No token provided.");
    }
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const user = await getUser(decodedToken.uid);
    if (user?.role !== 'admin') {
        throw new Error("Authorization failed: Not an admin.");
    }
    return user;
}

export async function approveProductAction(values: z.infer<typeof productActionSchema>) {
    try {
        await verifyAdmin();
        const { productId } = productActionSchema.parse(values);
        await updateProductStatus(productId, 'approved');

        revalidatePath('/admin/approvals');
        revalidatePath('/'); // Revalidate home page to show new products
        
        return { success: true, message: 'Product approved successfully.' };
    } catch(error: any) {
        console.error("Error in approveProductAction:", error);
        return { success: false, error: error.message };
    }
}


export async function rejectProductAction(values: z.infer<typeof productActionSchema>) {
    try {
        await verifyAdmin();
        const { productId } = productActionSchema.parse(values);
        await updateProductStatus(productId, 'rejected');

        revalidatePath('/admin/approvals');

        return { success: true, message: 'Product rejected successfully.' };
    } catch(error: any) {
        console.error("Error in rejectProductAction:", error);
        return { success: false, error: error.message };
    }
}
