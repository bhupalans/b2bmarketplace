
'use server';

import { adminDb } from "./firebase-admin";
import { Product, Category, User, Message } from "./types";
import { mockCategories, mockProducts } from "./mock-data";

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
  const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

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
    const sellerProducts = await getSellerProducts(sellerId);
    const acceptedOffersCount = 0; 
    const totalRevenue = 0; 
    const productsWithOfferCounts = sellerProducts.map(product => ({ ...product, offerCount: 0 })).sort((a, b) => b.offerCount - a.offerCount);

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
