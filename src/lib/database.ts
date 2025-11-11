

'use server';

import { adminDb } from "./firebase-admin";
import { Product, Category, User, Message, Conversation, Offer, SubscriptionPlan, BrandingSettings } from "./types";
import { mockCategories, mockProducts } from "./mock-data";
import { firestore, firestore as adminFirestore } from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Helper function to recursively convert Timestamps in any data structure
function serializeTimestamps(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeTimestamps);
  }

  if (typeof data === 'object') {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = serializeTimestamps(data[key]);
    }
    return res;
  }

  return data;
}


// --- Read Operations ---

export async function getBrandingSettings(): Promise<BrandingSettings> {
    const docRef = adminDb.collection('settings').doc('branding');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        return docSnap.data() as BrandingSettings;
    }
    return {}; // Return empty object if not found
}

export async function getProduct(productId: string): Promise<Product | null> {
    const productRef = adminDb.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) return null;
    const product = { id: productSnap.id, ...productSnap.data() } as Product;
    return serializeTimestamps(product);
}

export async function getCategories(): Promise<Category[]> {
    const snapshot = await adminDb.collection("categories").get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => {
      const category = { id: doc.id, ...doc.data() } as Category;
      return serializeTimestamps(category);
    });
}

export async function getUser(userId: string): Promise<User | null> {
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return null;
    
    const userData = userSnap.data() as User;

    // If the user has a subscription, fetch the plan details
    if (userData.subscriptionPlanId) {
        const planRef = adminDb.collection('subscriptionPlans').doc(userData.subscriptionPlanId);
        const planSnap = await planRef.get();
        if (planSnap.exists()) {
            userData.subscriptionPlan = { id: planSnap.id, ...planSnap.data() } as SubscriptionPlan;
        }
    }

    const user = { id: userSnap.id, uid: userSnap.id, ...userData };
    return serializeTimestamps(user);
}

export async function getUsers(): Promise<User[]> {
    const snapshot = await adminDb.collection("users").get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
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
            const user = { id: doc.id, uid: doc.id, ...doc.data() } as User;
            userMap.set(doc.id, serializeTimestamps(user));
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
    const user = { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User;
    return serializeTimestamps(user);
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

  // No need to serialize here, as getProduct and getUser already do it.
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
      const product = { id: doc.id, ...data } as Product;
      return serializeTimestamps(product);
  });

  // No need to serialize seller, as getUser already does it.
  return { seller, products };
}

export async function getSellerProducts(sellerId: string): Promise<Product[]> {
    const querySnapshot = await adminDb.collection("products").where("sellerId", "==", sellerId).get();
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const product = { id: doc.id, ...data } as Product;
        return serializeTimestamps(product);
    });
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
    
    // Categories do not have timestamps, so no serialization needed.
    return path;
}

export async function getAllConversationsForAdmin(): Promise<Conversation[]> {
    const snapshot = await adminDb.collection('conversations').orderBy('lastMessage.timestamp', 'desc').get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(docSnap => {
      const conversation = { id: docSnap.id, ...docSnap.data() } as Conversation;
      return serializeTimestamps(conversation);
    });
}

export async function getConversationForAdmin(conversationId: string): Promise<Conversation | null> {
    const convRef = adminDb.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
        return null;
    }
    const conversation = { id: convSnap.id, ...convSnap.data() } as Conversation;
    return serializeTimestamps(conversation);
}


export async function getPlanAndUser(planId: string, userId: string): Promise<{ plan: SubscriptionPlan, user: User }> {
    const [planSnap, userSnap] = await Promise.all([
        adminDb.collection('subscriptionPlans').doc(planId).get(),
        adminDb.collection('users').doc(userId).get()
    ]);
    
    if (!planSnap.exists) {
        throw new Error('Subscription plan not found.');
    }
    if (!userSnap.exists) {
        throw new Error('User not found.');
    }

    const planData = planSnap.data();
    const userData = userSnap.data();

    const plan = { id: planSnap.id, ...planData } as SubscriptionPlan;
    const user = {uid: userSnap.id, id: userSnap.id, ...userData} as User;

    return {
        plan: serializeTimestamps(plan),
        user: serializeTimestamps(user),
    }
}
