

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, getDoc, Timestamp, writeBatch, serverTimestamp, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product, Category, User, SpecTemplate, SpecTemplateField, Conversation, Message } from './types';
import { v4 as uuidv4 } from 'uuid';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "b2b-marketplace-udg1v.firebaseapp.com",
  projectId: "b2b-marketplace-udg1v",
  storageBucket: "b2b-marketplace-udg1v.firebasestorage.app",
  messagingSenderId: "822558435203",
  appId: "1:822558435203:web:c462791316c4540a2e78b6"
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

export async function getActiveCategoriesClient(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const q = query(categoriesCol, where("status", "==", "active"));
  const categorySnapshot = await getDocs(q);
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

// Rewritten, robust image upload function
async function uploadImages(files: File[], sellerId: string): Promise<string[]> {
  if (!files || files.length === 0) return [];
  
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    const filePath = `products/${sellerId}/${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, filePath);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploadedUrls.push(url);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      // This throw will be caught by the calling function's try/catch block
      throw new Error(`Image upload failed. Please check storage permissions and network connection.`);
    }
  }

  return uploadedUrls;
}

async function deleteImages(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return;

    const deletePromises = urls.map(url => {
        try {
            // Don't try to delete placeholder images
            if (url.includes('picsum.photos') || url.includes('placehold.co')) {
                return Promise.resolve();
            }
            const imageRef = ref(storage, url);
            return deleteObject(imageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete image at ${url}:`, error);
            }
            return Promise.resolve(); 
        }
    });

    await Promise.all(deletePromises);
}

export async function createOrUpdateProductClient(
  productFormData: { 
    title: string, 
    description: string, 
    priceUSD: number, 
    categoryId: string, 
    specifications?: { name: string; value: string }[],
    existingImages?: string[] 
  },
  newImageFiles: File[],
  sellerId: string,
  productId?: string | null
): Promise<Product> {
  // This is the critical validation check.
  if (!sellerId || typeof sellerId !== 'string' || sellerId.trim() === '') {
    throw new Error('Invalid or missing Seller ID. User must be authenticated.');
  }

  try {
    if (productId) {
      const productRef = doc(db, 'products', productId);
      const docSnap = await getDoc(productRef);
      if (!docSnap.exists()) {
        throw new Error("Product to update not found.");
      }
      
      const originalImages = docSnap.data().images || [];
      const keptImages = productFormData.existingImages || [];
      const imagesToDelete = originalImages.filter((url: string) => !keptImages.includes(url));

      const [newUploadedUrls] = await Promise.all([
        uploadImages(newImageFiles, sellerId),
        deleteImages(imagesToDelete)
      ]);
      
      const finalImageUrls = [...keptImages, ...newUploadedUrls];
      
      if (finalImageUrls.length === 0) {
          throw new Error('At least one image is required for a product.');
      }
      
      const productToUpdate = {
        ...productFormData,
        images: finalImageUrls,
        status: 'pending' as const, 
        updatedAt: Timestamp.now(),
      };

      await updateDoc(productRef, productToUpdate);
      const updatedDocSnap = await getDoc(productRef);
      return { id: productId, ...updatedDocSnap.data() } as Product;
    } 
    else {
      if (newImageFiles.length === 0) {
        throw new Error('At least one image is required to create a product.');
      }
      
      const uploadedImageUrls = await uploadImages(newImageFiles, sellerId);
      
      const productToCreate = {
          ...productFormData,
          images: uploadedImageUrls,
          sellerId: sellerId,
          status: 'pending' as const,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'products'), productToCreate);
      const newDocSnap = await getDoc(docRef);
      return { id: docRef.id, ...newDocSnap.data() } as Product;
    }
  } catch(error) {
      console.error("Error in createOrUpdateProductClient:", error);
      throw error;
  }
}

export async function deleteProductClient(product: Product): Promise<void> {
    if (!product || !product.id) {
        throw new Error("Product data is invalid.");
    }
    
    const productRef = doc(db, 'products', product.id);
    
    try {
        const docSnap = await getDoc(productRef);
        if (docSnap.exists()) {
          const imagesToDelete = docSnap.data().images || [];
          await deleteImages(imagesToDelete);
          await deleteDoc(productRef);
        } else {
          console.warn("Attempted to delete a product that does not exist:", product.id);
        }
    } catch (error) {
        console.error("Error deleting product:", error);
        throw new Error("Failed to delete product. Check Firestore/Storage rules and permissions.");
    }
}


// --- Spec Template Client Functions ---

export async function getSpecTemplatesClient(): Promise<SpecTemplate[]> {
  const specTemplatesCol = collection(db, "specTemplates");
  const snapshot = await getDocs(specTemplatesCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpecTemplate));
}

export async function createOrUpdateSpecTemplateClient(
  templateData: { name: string; fields: SpecTemplateField[] },
  templateId?: string | null
): Promise<SpecTemplate> {
  const dataToSave = {
    ...templateData,
    updatedAt: Timestamp.now(),
  };

  if (templateId) {
    const templateRef = doc(db, 'specTemplates', templateId);
    await updateDoc(templateRef, dataToSave);
    const updatedDoc = await getDoc(templateRef);
    return { id: templateId, ...updatedDoc.data() } as SpecTemplate;
  } else {
    const docRef = await addDoc(collection(db, 'specTemplates'), {
      ...dataToSave,
      createdAt: Timestamp.now(),
    });
    const newDoc = await getDoc(docRef);
    return { id: docRef.id, ...newDoc.data() } as SpecTemplate;
  }
}

export async function deleteSpecTemplateClient(templateId: string): Promise<void> {
  if (!templateId) {
    throw new Error("Template ID is invalid.");
  }
  const templateRef = doc(db, 'specTemplates', templateId);
  await deleteDoc(templateRef);
}

// --- Category Client Functions ---

export async function createOrUpdateCategoryClient(
  categoryData: { name: string; parentId: string | null; status: 'active' | 'inactive', specTemplateId?: string | null },
  categoryId?: string | null
): Promise<Category> {
  const dataToSave = {
    ...categoryData,
    updatedAt: Timestamp.now(),
  };

  if (categoryId) {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, dataToSave);
    const updatedDoc = await getDoc(categoryRef);
    return { id: categoryId, ...updatedDoc.data() } as Category;
  } else {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...dataToSave,
      createdAt: Timestamp.now(),
    });
    const newDoc = await getDoc(docRef);
    return { id: docRef.id, ...newDoc.data() } as Category;
  }
}

export async function deleteCategoryClient(categoryId: string): Promise<void> {
  // Simple delete, will fail if there are sub-categories due to Firestore rules if we enforce that.
  // For now, we assume the user manages this manually. A more robust solution would check for children first.
  if (!categoryId) {
    throw new Error("Category ID is invalid.");
  }
  const categoryRef = doc(db, 'categories', categoryId);
  await deleteDoc(categoryRef);
}


// --- Messaging Functions ---

export async function startConversation(data: {
    buyerId: string;
    sellerId: string;
    productId: string;
    productTitle: string;
    productImage: string;
    initialMessageText: string;
}): Promise<string> {

  const conversationQuery = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', data.buyerId),
    where('productId', '==', data.productId)
  );

  const querySnapshot = await getDocs(conversationQuery);
  let existingConversation = null;

  querySnapshot.forEach(doc => {
      const conv = doc.data() as Conversation;
      if (conv.participantIds.includes(data.sellerId)) {
          existingConversation = { id: doc.id, ...conv };
      }
  });
  
  if (existingConversation) {
    return existingConversation.id;
  }
  
  const conversationRef = doc(collection(db, 'conversations'));

  const batch = writeBatch(db);

  const newConversation: Omit<Conversation, 'id'> = {
    participantIds: [data.buyerId, data.sellerId],
    productId: data.productId,
    productTitle: data.productTitle,
    productImage: data.productImage,
    createdAt: serverTimestamp() as Timestamp,
    lastMessage: {
      text: data.initialMessageText,
      timestamp: serverTimestamp() as Timestamp,
      senderId: data.buyerId,
    },
  };
  batch.set(conversationRef, newConversation);

  const messageRef = doc(collection(conversationRef, 'messages'));
  const newMessage: Omit<Message, 'id'> = {
    conversationId: conversationRef.id,
    text: data.initialMessageText,
    senderId: data.buyerId,
    timestamp: serverTimestamp() as Timestamp,
  };
  batch.set(messageRef, newMessage);

  await batch.commit();
  return conversationRef.id;
}


export async function findOrCreateConversation(data: {
    buyerId: string;
    sellerId: string;
    productId: string;
    productTitle: string;
    productImage: string;
}): Promise<{ conversationId: string, isNew: boolean }> {

  const conversationQuery = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', data.buyerId),
    where('productId', '==', data.productId)
  );

  const querySnapshot = await getDocs(conversationQuery);
  let existingConversation = null;

  querySnapshot.forEach(doc => {
      const conv = doc.data() as Conversation;
      if (conv.participantIds.includes(data.sellerId)) {
          existingConversation = { id: doc.id, ...conv };
      }
  });
  
  if (existingConversation) {
    return { conversationId: existingConversation.id, isNew: false };
  }
  
  const conversationRef = await addDoc(collection(db, 'conversations'), {
    participantIds: [data.buyerId, data.sellerId],
    productId: data.productId,
    productTitle: data.productTitle,
    productImage: data.productImage,
    createdAt: serverTimestamp(),
    // Initialize with a non-null lastMessage to prevent query issues.
    lastMessage: {
        text: `Conversation about "${data.productTitle}" started.`,
        senderId: 'system', // Use a system sender for this initial placeholder
        timestamp: serverTimestamp()
    },
  });

  return { conversationId: conversationRef.id, isNew: true };
}


export function streamConversations(userId: string, callback: (conversations: Conversation[]) => void): () => void {
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessage.timestamp', 'desc')
  );

  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const convsWithDetails: Conversation[] = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const conv = { id: doc.id, ...doc.data() } as Conversation;
        const otherId = conv.participantIds.find(id => id !== userId);
        if (otherId) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          if (userDoc.exists()) {
            conv.otherParticipant = { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User;
          }
        }
        return conv;
      })
    );
    callback(convsWithDetails);
  }, (error) => {
      console.error("Error in streamConversations:", error);
      // Optional: You could have a way to notify the UI of the error.
      // For now, we just log it. This is often due to missing Firestore indexes.
  });

  return unsubscribe;
}


export async function getConversation(conversationId: string, currentUserId: string): Promise<{ conversation: Conversation, otherParticipant: User } | null> {
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);

    if (!convSnap.exists()) return null;
    
    const conversation = { id: convSnap.id, ...convSnap.data() } as Conversation;

    if (!conversation.participantIds.includes(currentUserId)) {
        // Security check
        return null;
    }

    const otherId = conversation.participantIds.find(id => id !== currentUserId);
    if (!otherId) return null;

    const userSnap = await getDoc(doc(db, 'users', otherId));
    if (!userSnap.exists()) return null;

    const otherParticipant = { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;

    return { conversation, otherParticipant };
}


export function streamMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        callback(messages);
    });

    return unsubscribe;
}

export async function sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
    const batch = writeBatch(db);

    const conversationRef = doc(db, 'conversations', conversationId);
    const messageRef = doc(collection(conversationRef, 'messages'));
    
    const newMessage: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        text,
        timestamp: serverTimestamp() as Timestamp
    };

    const lastMessageUpdate = {
        lastMessage: {
            text,
            senderId,
            timestamp: serverTimestamp()
        }
    };
    
    batch.set(messageRef, newMessage);
    batch.update(conversationRef, lastMessageUpdate);

    await batch.commit();
}


export { app, auth, db, storage };
