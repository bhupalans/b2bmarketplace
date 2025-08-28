

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product, Category, User } from './types';
import { v4 as uuidv4 } from 'uuid';

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

export async function getProductAndSellerClient(productId: string): Promise<{ product: Product; seller: User | null } | null> {
  const productRef = doc(db, 'products', productId);
  const productSnap = await getDoc(productRef);
  if (!productSnap.exists() || productSnap.data().status !== 'approved') {
    return null;
  }
  const product = { id: productSnap.id, ...productSnap.data() } as Product;
  
  let seller: User | null = null;
  if (product.sellerId) {
    try {
        const userRef = doc(db, 'users', product.sellerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            seller = { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;
        }
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}.`, error);
        seller = null;
    }
  }

  return { product, seller };
}

export async function getCategoryPathClient(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | null = categoryId;
  
    while (currentId) {
      const categoryRef = doc(db, 'categories', currentId);
      const categorySnap = await getDoc(categoryRef);
  
      if (categorySnap.exists()) {
        const categoryData = { id: categorySnap.id, ...categorySnap.data() } as Category;
        path.unshift(categoryData);
        currentId = categoryData.parentId;
      } else {
        currentId = null;
      }
    }
    
    return path;
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

// Client-side function for creating or updating a product
export async function createOrUpdateProductClient(
    productData: Omit<Product, 'id' | 'images' | 'status'>,
    newImageFiles: File[],
    existingImageUrls: string[],
    sellerId: string,
    productId?: string | null
): Promise<Product> {

    // 1. Upload new images to Firebase Storage
    const uploadedImageUrls = [];
    for (const file of newImageFiles) {
        const filePath = `products/${sellerId}/${uuidv4()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        uploadedImageUrls.push(downloadURL);
    }

    const allImageUrls = [...existingImageUrls, ...uploadedImageUrls];
    if (allImageUrls.length === 0) {
        throw new Error('At least one image is required.');
    }

    // 2. Prepare data for Firestore
    const finalProductData: Omit<Product, 'id'> = {
        ...productData,
        images: allImageUrls,
        sellerId: sellerId,
        status: 'pending', // Always set to pending for review
    };
    
    // 3. Write to Firestore
    if (productId) {
        // Update existing product
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, finalProductData);
        return { id: productId, ...finalProductData };
    } else {
        // Create new product
        const productRef = await addDoc(collection(db, 'products'), finalProductData);
        return { id: productRef.id, ...finalProductData };
    }
}

// Client-side function to delete a product and its images
export async function deleteProductClient(product: Product): Promise<void> {
    if (!product || !product.id) {
        throw new Error("Product data is invalid.");
    }
    
    // Delete images from Firebase Storage
    for (const imageUrl of product.images) {
        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (storageError: any) {
            if (storageError.code !== 'storage/object-not-found') {
                 console.error(`Failed to delete image ${imageUrl} from storage:`, storageError.message);
            }
        }
    }
    
    // Delete the product document from Firestore
    const productRef = doc(db, 'products', product.id);
    await deleteDoc(productRef);
}


export { app, auth, db, storage };
