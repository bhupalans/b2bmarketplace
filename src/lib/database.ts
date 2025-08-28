
'use server';

import { adminDb } from "./firebase-admin";
import { Product, Category, User, Message } from "./types";

// This file contains server-side only database logic.
// It uses the Firebase Admin SDK, which has super-user privileges
// and bypasses security rules.

// --- Read Operations ---

export async function getProducts(): Promise<Product[]> {
  const productsCol = adminDb.collection("products").where("status", "==", "approved");
  const productSnapshot = await productsCol.get();
  const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  return productList;
}

export async function getProduct(productId: string): Promise<Product | null> {
    const productRef = adminDb.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) return null;
    return { id: productSnap.id, ...productSnap.data() } as Product;
}

export async function getCategories(): Promise<Category[]> {
  const categoriesCol = adminDb.collection("categories");
  const categorySnapshot = await categoriesCol.get();
  const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  return categoryList;
}

export async function getUser(userId: string): Promise<User | null> {
    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return null;
    return { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;
}

export async function getUsers(): Promise<User[]> {
  const usersCol = adminDb.collection("users");
  const userSnapshot = await usersCol.get();
  const userList = userSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      uid: doc.id,
    } as User;
  });
  return userList;
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

// --- Write Operations ---

export async function createOrUpdateProduct(
  productData: Omit<Product, 'id'>,
  productId?: string
): Promise<Product> {
  const productRef = productId
    ? adminDb.collection('products').doc(productId)
    : adminDb.collection('products').doc();

  if (productId) {
    // Updating existing product, we don't change the status
    await productRef.update(productData);
    const doc = await productRef.get();
    return { id: doc.id, ...doc.data() } as Product;
  } else {
    // Creating new product, status should be 'pending'
    const newProductData = {
      ...productData,
      status: productData.status || 'pending', // Default to pending
    };
    await productRef.set(newProductData);
    return { id: productRef.id, ...newProductData } as Product;
  }
}


export async function deleteProduct(productId: string): Promise<void> {
  const productRef = adminDb.collection('products').doc(productId);
  await productRef.delete();
}
