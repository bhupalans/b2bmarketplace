
'use server';

import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { headers } from "next/headers";
import { Product } from "@/lib/types";

// Helper function to check if the caller is an admin
async function isAdmin() {
    // This is a basic check. For production, you'd want more robust security.
    // E.g. checking Firebase Auth custom claims.
    // For now, we'll check if the referer is from the admin section.
    const referer = headers().get('referer');
    return referer?.includes('/admin');
}

export async function migrateProductPrices() {
    if (!(await isAdmin())) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

        if (snapshot.empty) {
            return { success: true, message: 'No products found to migrate.' };
        }

        const batch = adminDb.batch();
        let migratedCount = 0;

        snapshot.docs.forEach(doc => {
            const product = doc.data() as Partial<Product> & { price?: any, priceUSD?: number };

            // Check if the product has the old priceUSD field and not the new price object
            if (product.priceUSD !== undefined && product.price === undefined) {
                batch.update(doc.ref, {
                    price: {
                        baseAmount: product.priceUSD,
                        baseCurrency: 'USD'
                    },
                    priceUSD: adminDb.FieldValue.delete() // Remove the old field
                });
                migratedCount++;
            }
        });

        if (migratedCount === 0) {
            return { success: true, message: 'All products already have the new price format. No migration needed.' };
        }

        await batch.commit();

        return { success: true, message: `Successfully migrated ${migratedCount} product(s) to the new price format.` };

    } catch (error: any) {
        console.error("Error migrating product prices:", error);
        return { success: false, error: error.message };
    }
}


export async function clearAllProducts() {
    if (!(await isAdmin())) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const batchSize = 200;
        const productsRef = adminDb.collection('products');
        let query = productsRef.limit(batchSize);
        let deletedCount = 0;
        let imagesToDelete: string[] = [];

        while (true) {
            const snapshot = await query.get();
            if (snapshot.size === 0) break;

            const batch = adminDb.batch();
            snapshot.docs.forEach(doc => {
                const productImages = doc.data().images;
                if (Array.isArray(productImages)) {
                    imagesToDelete.push(...productImages);
                }
                batch.delete(doc.ref);
            });
            await batch.commit();

            deletedCount += snapshot.size;

            if (snapshot.size < batchSize) break;

            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            query = productsRef.startAfter(lastVisible).limit(batchSize);
        }

        // Delete images from storage
        const deletePromises = imagesToDelete
            .filter(url => url.includes('firebasestorage.googleapis.com'))
            .map(url => {
                try {
                    const imageRef = adminStorage.bucket().file(decodeURIComponent(url.split('/o/')[1].split('?')[0]));
                    return imageRef.delete().catch(err => console.warn(`Warn: Could not delete image ${url}. It may have already been deleted.`, err.code));
                } catch(e) {
                    console.error('Error parsing image URL for deletion:', url, e);
                    return Promise.resolve();
                }
            });

        await Promise.all(deletePromises);

        return { success: true, message: `Successfully deleted ${deletedCount} products and their images.` };

    } catch (error: any) {
        console.error("Error clearing products:", error);
        return { success: false, error: error.message };
    }
}

async function deleteCollection(collectionPath: string, batchSize: number) {
    const collectionRef = adminDb.collection(collectionPath);
    const query = collectionRef.limit(batchSize);
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });

    async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void, reject: (reason?: any) => void) {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            resolve(true);
            return;
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        deletedCount += snapshot.size;

        if (snapshot.size > 0) {
            process.nextTick(() => {
                deleteQueryBatch(query, resolve, reject);
            });
        }
    }
}


export async function clearAllConversationsAndOffers() {
    if (!(await isAdmin())) {
        return { success: false, error: 'Unauthorized' };
    }
    
    try {
        const conversationsRef = adminDb.collection('conversations');
        const conversationsSnapshot = await conversationsRef.get();
        const batch = adminDb.batch();

        for (const convDoc of conversationsSnapshot.docs) {
            // Delete messages subcollection
            const messagesRef = convDoc.ref.collection('messages');
            const messagesSnapshot = await messagesRef.get();
            messagesSnapshot.docs.forEach(msgDoc => batch.delete(msgDoc.ref));
            
            // Delete conversation itself
            batch.delete(convDoc.ref);
        }
        await batch.commit();

        // Delete all offers
        await deleteCollection('offers', 200);

        return { success: true, message: 'All conversations, messages, and offers have been deleted.' };
    } catch (error: any) {
        console.error("Error clearing conversations and offers:", error);
        return { success: false, error: error.message };
    }
}


export async function clearAllNonAdminUsers() {
    if (!(await isAdmin())) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const adminUser = await adminAuth.getUserByEmail('admin@b2b.com');
        const adminUid = adminUser.uid;

        let deletedUserCount = 0;
        let pageToken;

        do {
            const listUsersResult = await adminAuth.listUsers(1000, pageToken);
            const uidsToDelete: string[] = [];
            const usersToDelete = listUsersResult.users.filter(user => user.uid !== adminUid);
            
            if (usersToDelete.length > 0) {
                usersToDelete.forEach(user => uidsToDelete.push(user.uid));
                
                const deleteResult = await adminAuth.deleteUsers(uidsToDelete);
                deletedUserCount += deleteResult.successCount;

                // Now delete from Firestore
                const batch = adminDb.batch();
                uidsToDelete.forEach(uid => {
                    const userDocRef = adminDb.collection('users').doc(uid);
                    batch.delete(userDocRef);
                });
                await batch.commit();
            }
            
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        return { success: true, message: `Successfully deleted ${deletedUserCount} non-admin users.` };

    } catch (error: any) {
        console.error("Error clearing non-admin users:", error);
        return { success: false, error: error.message };
    }
}
