

'use server';

import { adminDb } from "./firebase-admin";
import { Product, Category, User, Message, Conversation, Offer } from "./types";
import { mockCategories, mockProducts } from "./mock-data";
import { firestore, firestore as adminFirestore } from "firebase-admin";

// --- Read Operations ---

export async function getProduct(productId: string): Promise<Product | null> {
    const productRef = adminDb.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) return null;
    return { id: productSnap.id, ...productSnap.data() } as Product;
}

export async function getUser(userId: string): Promise<User | null> {
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return null;
    return { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;
}

export async function getUsersByIds(userIds: string[]): Promise<Map<string, User>> {
    if (userIds.length === 0) {
        return new Map();
    }
    const userMap = new Map<string, User>();
    const userIdsToFetch = [...new Set(userIds)]; 
    
    const chunks: string[][] = [];
    for (let i = 0; i < userIdsToFetch.length; i += 30) {
        chunks.push(userIdsToFetch.slice(i, i + 30));
    }

    const usersRef = adminDb.collection('users');

    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        
        const snapshot = await usersRef.where(firestore.FieldPath.documentId(), 'in', chunk).get();

        snapshot.forEach(doc => {
            userMap.set(doc.id, { id: doc.id, uid: doc.id, ...doc.data() } as User);
        });
    }

    return userMap;
}

export async function findUserByUsername(username: string): Promise<User | null> {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
        return null;
    }
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User;
}

export async function getProductAndSeller(productId: string): Promise<{ product: Product; seller: User | null } | null> {
  const product = await getProduct(productId);
  // Only show approved products on the detail page
  if (!product || product.status !== 'approved') {
    return null;
  }
  
  let seller: User | null = null;
  if (product.sellerId) {
    try {
        seller = await getUser(product.sellerId);
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}.`, error);
        seller = null;
    }
  }

  return { product, seller };
}

export async function getSellerAndProducts(sellerId: string): Promise<{ seller: User; products: Product[] } | null> {
  const seller = await getUser(sellerId);

  if (!seller) {
    return null;
  }
  
  // Public seller profile should only show approved products
  const productsSnapshot = await adminDb.collection("products")
    .where("sellerId", "==", sellerId)
    .where("status", "==", "approved")
    .get();

  const products = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Serialize Timestamps before sending to client components
      const serializableData = {
          ...data,
          createdAt: data.createdAt instanceof adminFirestore.Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof adminFirestore.Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
      return { id: doc.id, ...serializableData } as Product;
  });

  return { seller, products };
}

export async function getSellerProducts(sellerId: string): Promise<Product[]> {
    // This server function gets ALL products for a seller, regardless of status,
    // for use in the seller's own dashboard/views.
    const querySnapshot = await adminDb.collection("products").where("sellerId", "==", sellerId).get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function getCategoryPath(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | null = categoryId;
  
    while (currentId) {
      const categorySnap = await adminDb.collection('categories').doc(currentId).get();
  
      if (categorySnap.exists) {
        const categoryData = { id: categorySnap.id, ...categorySnap.data() } as Category;
        path.unshift(categoryData);
        currentId = categoryData.parentId;
      } else {
        currentId = null;
      }
    }
    
    return path;
}

export async function getSellerDashboardData(sellerId: string): Promise<{
  totalRevenue: number;
  acceptedOffersCount: number;
  totalProducts: number;
  productsWithOfferCounts: (Product & { offerCount: number })[];
} | null> {
  try {
    // Fetch all products and all offers for the seller in parallel
    const [sellerProducts, offersSnapshot] = await Promise.all([
        getSellerProducts(sellerId),
        adminDb.collection("offers").where("sellerId", "==", sellerId).get()
    ]);
    
    const offers = offersSnapshot.docs.map(doc => doc.data() as Offer);

    // Calculate revenue and counts from accepted offers
    let totalRevenue = 0;
    let acceptedOffersCount = 0;
    const acceptedOffers = offers.filter(offer => offer.status === 'accepted');
    
    acceptedOffers.forEach(offer => {
        totalRevenue += offer.quantity * offer.pricePerUnit;
        acceptedOffersCount++;
    });

    // Create a map to count offers per product
    const offerCountsByProductId = new Map<string, number>();
    offers.forEach(offer => {
        offerCountsByProductId.set(
            offer.productId,
            (offerCountsByProductId.get(offer.productId) || 0) + 1
        );
    });

    // Combine product data with offer counts
    const productsWithOfferCounts = sellerProducts.map(product => ({
        ...product,
        offerCount: offerCountsByProductId.get(product.id) || 0,
    })).sort((a, b) => b.offerCount - a.offerCount); // Sort by most offers

    return {
      totalRevenue,
      acceptedOffersCount,
      totalProducts: sellerProducts.length,
      productsWithOfferCounts,
    };
  } catch (error) {
    console.error("Error fetching seller dashboard data:", error);
    return null;
  }
}


export async function getAllConversationsForAdmin(): Promise<Conversation[]> {
    const snapshot = await adminDb.collection('conversations').orderBy('lastMessage.timestamp', 'desc').get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Conversation));
}

export async function getConversationForAdmin(conversationId: string): Promise<Conversation | null> {
    const convRef = adminDb.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
        return null;
    }
    return { id: convSnap.id, ...convSnap.data() } as Conversation;
}
