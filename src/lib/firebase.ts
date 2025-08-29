import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
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

export async function getProductClient(productId: string): Promise<Product | null> {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
        return null;
    }
    return { id: productSnap.id, ...productSnap.data() } as Product;
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)).sort((a,b) => ((b.createdAt as Timestamp)?.toMillis() || 0) - ((a.createdAt as Timestamp)?.toMillis() || 0));
}

// Client-side function to update product status, to be secured by Firestore rules
export async function updateProductStatus(
  productId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, { status });
}

async function uploadImages(files: File[], sellerId: string): Promise<string[]> {
  const uploadedImageUrls = await Promise.all(
    files.map(async (file) => {
      const filePath = `products/${sellerId}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    })
  );
  return uploadedImageUrls;
}

async function deleteImages(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
    } catch (error: any) {
      if (error.code !== 'storage/object-not-found') {
        console.error(`Failed to delete image ${url} from storage:`, error);
      }
    }
  }
}

// Client-side function for creating or updating a product
export async function createOrUpdateProductClient(
  productData: Omit<Product, 'id' | 'images' | 'status' | 'sellerId' | 'createdAt' | 'updatedAt'>,
  newImageFiles: File[],
  existingImageUrls: string[],
  sellerId: string,
  productId?: string | null
): Promise<Product> {

    // --- UPDATE PATH ---
    if (productId) {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        if (!docSnap.exists()) {
            throw new Error("Product to update not found.");
        }

        const originalProductData = docSnap.data() as Product;
        const imagesToDelete = originalProductData.images.filter(url => !existingImageUrls.includes(url));
        
        await deleteImages(imagesToDelete);

        const newUploadedUrls = await uploadImages(newImageFiles, sellerId);
        const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];
        if (finalImageUrls.length === 0) {
            throw new Error('At least one image is required.');
        }

        const finalProductData = {
            ...productData,
            images: finalImageUrls,
            status: 'pending' as const, // Reset status for re-approval
            updatedAt: Timestamp.now(),
            sellerId: sellerId, // Ensure sellerId is maintained
            createdAt: originalProductData.createdAt || Timestamp.now(), // Preserve original creation date
        };

        await updateDoc(productRef, finalProductData);
        const updatedDocSnap = await getDoc(productRef);
        return { id: productId, ...updatedDocSnap.data() } as Product;
    } 
    // --- CREATE PATH ---
    else {
        if (newImageFiles.length === 0) {
            throw new Error('At least one image is required.');
        }
        const newUploadedUrls = await uploadImages(newImageFiles, sellerId);
        
        const finalProductData = {
            ...productData,
            images: newUploadedUrls,
            sellerId: sellerId,
            status: 'pending' as const,
            createdAt: Timestamp.now(),
        };
        
        const docRef = await addDoc(collection(db, 'products'), finalProductData);
        const newDocSnap = await getDoc(docRef);
        return { id: docRef.id, ...newDocSnap.data() } as Product;
    }
}


// Client-side function to delete a product and its images
export async function deleteProductClient(product: Product): Promise<void> {
    if (!product || !product.id) {
        throw new Error("Product data is invalid.");
    }
    
    // Delete images from Firebase Storage
    await deleteImages(product.images || []);
    
    // Delete the product document from Firestore
    const productRef = doc(db, 'products', product.id);
    await deleteDoc(productRef);
}


export { app, auth, db, storage };
