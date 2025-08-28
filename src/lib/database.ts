
'use server';

import { adminDb } from "./firebase-admin";
import { Product, Category, User, Message } from "./types";
import { mockCategories, mockProducts } from "./mock-data";

// --- Seeding Operation ---

export async function seedDatabase() {
  console.log("Checking if database needs seeding...");

  const seedCheckRef = adminDb.collection('internal').doc('seedStatus');
  const seedCheckSnap = await seedCheckRef.get();

  if (seedCheckSnap.exists && seedCheckSnap.data()?.completed) {
    console.log("Database already seeded. Skipping.");
    return { success: true, message: "Database already seeded." };
  }

  console.log("Seeding database with initial data...");

  const batch = adminDb.batch();

  // 1. Seed Categories
  mockCategories.forEach(category => {
    const docRef = adminDb.collection('categories').doc(category.id);
    batch.set(docRef, category);
  });
  console.log("-> Prepared categories for seeding.");

  // 2. Seed Products
  mockProducts.forEach(product => {
    // We remove the hardcoded ID to let Firestore auto-generate one
    // but for this seeding purpose, we will keep the IDs consistent.
    const { id, ...productData } = product;
    const docRef = adminDb.collection('products').doc(id);
    // Add a default 'approved' status for seeded products
    batch.set(docRef, { ...productData, status: 'approved' });
  });
  console.log("-> Prepared products for seeding.");

  // 3. Seed the Admin User
  const adminUid = 'mNLTRIhyPGeOxlUSUZGq2mgcCZF2';
  const adminUser: Omit<User, 'id'> = {
      uid: adminUid,
      email: 'admin@b2b.com',
      name: 'Admin',
      role: 'admin',
      username: 'admin',
      avatar: `https://i.pravatar.cc/150?u=${adminUid}`
  };
  const adminRef = adminDb.collection('users').doc(adminUid);
  batch.set(adminRef, adminUser);
  console.log("-> Prepared admin user for seeding.");

  // 4. Mark seeding as complete
  batch.set(seedCheckRef, { completed: true, timestamp: new Date() });

  try {
    await batch.commit();
    console.log("Database seeding completed successfully!");
    return { success: true, message: "Database seeded successfully." };
  } catch (error) {
    console.error("Error seeding database:", error);
    return { success: false, message: "Error seeding database." };
  }
}


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

export async function findUserByUsername(username: string): Promise<User | null> {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', username).limit(1).get();

    if (snapshot.empty) {
        return null;
    }
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User;
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
    await productRef.update(productData);
  } else {
    await productRef.set(productData);
  }
  
  const doc = await productRef.get();
  return { id: doc.id, ...doc.data() } as Product;
}


export async function deleteProduct(productId: string): Promise<void> {
  const productRef = adminDb.collection('products').doc(productId);
  await productRef.delete();
}

export async function updateProductStatus(
  productId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const productRef = adminDb.collection('products').doc(productId);
  await productRef.update({ status });
}
