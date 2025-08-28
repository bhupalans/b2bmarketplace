
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Product, Category, User } from './types';

const firebaseConfig = {
  projectId: 'b2b-marketplace-udg1v',
  appId: '1:822558435203:web:c462791316c4540a2e78b6',
  storageBucket: 'b2b-marketplace-udg1v.appspot.com',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'b2b-marketplace-udg1v.firebaseapp.com',
  messagingSenderId: '822558435203',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Client-side data fetching functions
export async function getProductsClient(): Promise<Product[]> {
  const productsCol = collection(db, "products");
  // Only fetch approved products for the public-facing client pages
  const q = query(productsCol, where("status", "==", "approved"));
  const productSnapshot = await getDocs(q);
  return productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function getPendingProducts(): Promise<Product[]> {
    const productsCol = collection(db, "products");
    const q = query(productsCol, where("status", "==", "pending"));
    const productSnapshot = await getDocs(q);
    return productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

export async function getCategoriesClient(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const categorySnapshot = await getDocs(categoriesCol);
  return categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export async function getUsersClient(): Promise<User[]> {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
   const userList = userSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      uid: doc.id, // ensure uid is set from the doc id
    } as User;
  });
  return userList;
}

// Fetches ALL of a seller's products for their "My Products" page
export async function getSellerProductsClient(sellerId: string): Promise<Product[]> {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("sellerId", "==", sellerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

// Client-side function to update product status, to be secured by Firestore rules
export async function updateProductStatus(
  productId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, { status });
}


export { app, auth, db, storage };
