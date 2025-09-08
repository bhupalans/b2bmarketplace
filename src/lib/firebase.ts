

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, getDoc as getDocClient, Timestamp, writeBatch, serverTimestamp, orderBy, onSnapshot, limit, FirestoreError, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product, Category, User, SpecTemplate, SpecTemplateField, Conversation, Message, Offer, OfferStatusUpdate, VerificationTemplate, VerificationField } from './types';
import { v4 as uuidv4 } from 'uuid';
import { filterContactDetails } from '@/ai/flows/filter-contact-details';

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

// Helper function to convert Timestamps in an object to strings
const convertTimestamps = (data: any): any => {
    if (!data) return data;
    const newData: { [key: string]: any } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString();
        } else if (typeof newData[key] === 'object' && newData[key] !== null && !Array.isArray(newData[key])) {
            // Recursively convert nested objects, but not arrays
            newData[key] = convertTimestamps(newData[key]);
        }
    }
    return newData;
};


// Client-side data fetching functions
export async function getProductsClient(): Promise<Product[]> {
  const productsCol = collection(db, "products");
  // Only fetch approved products for the public-facing client pages
  const q = query(productsCol, where("status", "==", "approved"));
  const productSnapshot = await getDocs(q);
  return productSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Product));
}

export async function getProductClient(productId: string): Promise<Product | null> {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDocClient(productRef);

    if (!productSnap.exists()) {
        return null;
    }
    const productData = convertTimestamps(productSnap.data());
    return { id: productSnap.id, ...productData } as Product;
}

export async function getProductAndSellerClient(productId: string): Promise<{ product: Product; seller: User | null } | null> {
  const product = await getProductClient(productId);
  if (!product || product.status !== 'approved') {
    return null;
  }
  
  let seller: User | null = null;
  if (product.sellerId) {
    try {
        const userRef = doc(db, 'users', product.sellerId);
        const userSnap = await getDocClient(userRef);
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

export async function getSellerAndProductsClient(sellerId: string): Promise<{ seller: User; products: Product[] } | null> {
  const userRef = doc(db, 'users', sellerId);
  const userSnap = await getDocClient(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }

  const seller = { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;

  const productsRef = collection(db, "products");
  const q = query(productsRef, where("sellerId", "==", sellerId), where("status", "==", "approved"));
  const productsSnapshot = await getDocs(q);
  
  const products = productsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { id: docSnap.id, ...convertTimestamps(data) } as Product;
  });

  return { seller, products };
}

export async function getCategoryPathClient(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | null = categoryId;
  
    while (currentId) {
      const categoryRef = doc(db, 'categories', currentId);
      const categorySnap = await getDocClient(categoryRef);
  
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
    return productSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Product));
}

export async function getCategoriesClient(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const categorySnapshot = await getDocs(categoriesCol);
  return categorySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Category));
}

export async function getActiveCategoriesClient(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const q = query(categoriesCol, where("status", "==", "active"));
  const categorySnapshot = await getDocs(q);
  return categorySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Category));
}


export async function getUsersClient(): Promise<User[]> {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
   const userList = userSnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      uid: docSnap.id, // ensure uid is set from the doc id
    } as User;
  });
  return userList;
}

export async function getUsersByIdsClient(userIds: string[]): Promise<Map<string, User>> {
    if (userIds.length === 0) {
        return new Map();
    }
    const userMap = new Map<string, User>();
    // Firestore 'in' queries are limited to 30 items. For a larger app, this would need chunking.
    const userIdsToFetch = [...new Set(userIds)]; // Remove duplicates
    
    // Chunk the userIds to respect Firestore's 30-item limit for 'in' queries
    const chunks: string[][] = [];
    for (let i = 0; i < userIdsToFetch.length; i += 30) {
        chunks.push(userIdsToFetch.slice(i, i + 30));
    }

    const usersRef = collection(db, 'users');
    
    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const snapshot = await getDocs(query(usersRef, where('uid', 'in', chunk)));
        snapshot.forEach(userDoc => {
            userMap.set(userDoc.id, { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User);
        });
    }

    return userMap;
}

// Fetches ALL of a seller's products for their "My Products" page
export async function getSellerProductsClient(sellerId: string): Promise<Product[]> {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("sellerId", "==", sellerId));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { id: docSnap.id, ...convertTimestamps(data) } as Product;
    });

    return products.sort((a,b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
    });
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

// Deep comparison function for specifications array. It is robust to key order.
function areSpecificationsEqual(
  specs1: { name: string; value: string }[] | undefined,
  specs2: { name: string; value: string }[] | undefined
): boolean {
  const s1 = specs1 || [];
  const s2 = specs2 || [];

  if (s1.length !== s2.length) {
    return false;
  }
  
  // Sort both arrays by name to ensure consistent order for comparison
  const sortedS1 = [...s1].sort((a, b) => a.name.localeCompare(b.name));
  const sortedS2 = [...s2].sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < sortedS1.length; i++) {
    if (sortedS1[i].name !== sortedS2[i].name || sortedS1[i].value !== sortedS2[i].value) {
      return false;
    }
  }

  return true;
}


// This function is the new, robust implementation for creating/updating products.
export async function createOrUpdateProductClient(
  productFormData: Omit<Product, 'id' | 'images' | 'status' | 'sellerId' | 'createdAt' | 'updatedAt'> & {
    existingImages?: string[]
  },
  newImageFiles: File[],
  sellerId: string,
  productId?: string | null
): Promise<{ product: Product, autoApproved: boolean }> {
  if (!sellerId || typeof sellerId !== 'string' || sellerId.trim() === '') {
    throw new Error('Invalid or missing Seller ID. User must be authenticated.');
  }

  try {
    if (productId) {
      // --- UPDATE LOGIC ---
      const productRef = doc(db, 'products', productId);
      const originalProductSnap = await getDocClient(productRef);
      if (!originalProductSnap.exists()) {
        throw new Error("Product to update not found.");
      }
      const originalProduct = originalProductSnap.data() as Product;
      
      let finalStatus: Product['status'] = originalProduct.status;
      let autoApproved = false;

      // Only run auto-approval logic if the product is already approved.
      if (originalProduct.status === 'approved') {
        const autoApprovalRules = await getProductUpdateRulesClient();
        const changedFields: (keyof Product)[] = [];

        // List of all editable fields by the user
        const editableFields: (keyof Product)[] = [
            'title', 'description', 'priceUSD', 'categoryId', 'countryOfOrigin',
            'stockAvailability', 'moq', 'moqUnit', 'sku', 'leadTime', 'specifications'
        ];

        for (const key of editableFields) {
          const originalValue = originalProduct[key as keyof Product];
          let submittedValue = productFormData[key as keyof typeof productFormData];

          // Normalize undefined/null to empty strings for a more reliable comparison.
          const normalizedOriginal = (originalValue === null || originalValue === undefined) ? "" : originalValue;
          const normalizedSubmitted = (submittedValue === null || submittedValue === undefined) ? "" : submittedValue;

          if (key === 'specifications') {
            if (!areSpecificationsEqual(originalProduct.specifications, productFormData.specifications)) {
              changedFields.push(key);
            }
          } else if (String(normalizedOriginal) !== String(normalizedSubmitted)) {
             changedFields.push(key);
          }
        }
        
        // Image change detection
        const originalImages = originalProduct.images || [];
        const keptImages = productFormData.existingImages || [];
        if (newImageFiles.length > 0 || originalImages.length !== keptImages.length) {
            changedFields.push('images');
        }

        const requiresReview = changedFields.some(field => !autoApprovalRules.includes(field));
        
        if (requiresReview) {
            finalStatus = 'pending';
            autoApproved = false;
        } else {
            finalStatus = 'approved';
            autoApproved = true;
        }

      } else {
        // If the product was previously 'rejected' or 'pending', any new submission
        // should put it back into the 'pending' state for review.
        finalStatus = 'pending';
        autoApproved = false;
      }
      
      // --- Image Handling ---
      const imagesToDelete = (originalProduct.images || []).filter((url: string) => !(productFormData.existingImages || []).includes(url));
      const [newUploadedUrls] = await Promise.all([
        uploadImages(newImageFiles, sellerId),
        deleteImages(imagesToDelete)
      ]);
      const finalImageUrls = [...(productFormData.existingImages || []), ...newUploadedUrls];
      
      if (finalImageUrls.length === 0) {
        throw new Error('At least one image is required for a product.');
      }
      
      // --- Prepare and Save Data ---
      const { existingImages, ...dataToSave } = productFormData;
      const productToUpdate = {
        ...dataToSave,
        images: finalImageUrls,
        status: finalStatus,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(productRef, productToUpdate);
      const updatedDocSnap = await getDocClient(productRef);
      const updatedData = convertTimestamps(updatedDocSnap.data());
      return { 
        product: { id: productId, ...updatedData } as Product, 
        autoApproved
      };

    } else {
      // --- CREATE LOGIC ---
      if (newImageFiles.length === 0) {
        throw new Error('At least one image is required to create a product.');
      }
      
      const uploadedImageUrls = await uploadImages(newImageFiles, sellerId);
      const { existingImages, ...dataToSave } = productFormData;

      const productToCreate = {
          ...dataToSave,
          images: uploadedImageUrls,
          sellerId: sellerId,
          status: 'pending' as const,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'products'), productToCreate);
      const newDocSnap = await getDocClient(docRef);
      const newData = convertTimestamps(newDocSnap.data());
      return { 
          product: { id: docRef.id, ...newData } as Product, 
          autoApproved: false 
      };
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
        const docSnap = await getDocClient(productRef);
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
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as SpecTemplate));
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
    const updatedDoc = await getDocClient(templateRef);
    return { id: templateId, ...updatedDoc.data() } as SpecTemplate;
  } else {
    const docRef = await addDoc(collection(db, 'specTemplates'), {
      ...dataToSave,
      createdAt: Timestamp.now(),
    });
    const newDoc = await getDocClient(docRef);
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

// --- Verification Template Client Functions ---
export async function getVerificationTemplatesClient(): Promise<VerificationTemplate[]> {
    const ref = collection(db, "verificationTemplates");
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as VerificationTemplate));
}

export async function createOrUpdateVerificationTemplateClient(
  templateData: { countryName: string; fields: VerificationField[] },
  templateId: string
): Promise<VerificationTemplate> {
  
  const cleanedFields = templateData.fields.map(f => {
    const newField: any = {...f};
    // Remove empty optional fields to prevent Firestore 'undefined' error
    if (!newField.validationRegex) delete newField.validationRegex;
    if (!newField.helperText) delete newField.helperText;
    return newField;
  });

  const dataToSave = {
    countryName: templateData.countryName,
    fields: cleanedFields,
    updatedAt: Timestamp.now(),
  };

  const templateRef = doc(db, 'verificationTemplates', templateId);
  const docSnap = await getDocClient(templateRef);

  if (docSnap.exists()) {
    await updateDoc(templateRef, dataToSave);
  } else {
    await setDoc(templateRef, { ...dataToSave, createdAt: Timestamp.now() });
  }

  const newDoc = await getDocClient(templateRef);
  return { id: newDoc.id, ...newDoc.data() } as VerificationTemplate;
}

export async function deleteVerificationTemplateClient(templateId: string): Promise<void> {
  if (!templateId) {
    throw new Error("Template ID is invalid.");
  }
  const templateRef = doc(db, 'verificationTemplates', templateId);
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
    const updatedDoc = await getDocClient(categoryRef);
    return { id: categoryId, ...updatedDoc.data() } as Category;
  } else {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...dataToSave,
      createdAt: Timestamp.now(),
    });
    const newDoc = await getDocClient(docRef);
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

export async function findOrCreateConversation(data: {
    buyerId: string;
    sellerId: string;
    productId: string;
    productTitle: string;
    productImage: string;
}): Promise<{ conversationId: string, isNew: boolean }> {
  const productSnap = await getDocClient(doc(db, "products", data.productId));
  if (!productSnap.exists()) {
    throw new Error("Cannot start conversation: Product does not exist.");
  }
  const productData = productSnap.data();
  const productSellerId = productData.sellerId;


  const conversationQuery = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', data.buyerId),
    where('productId', '==', data.productId)
  );

  const querySnapshot = await getDocs(conversationQuery);
  let existingConversation: (Conversation & { id: string }) | null = null;


  querySnapshot.forEach(docSnap => {
      const conv = docSnap.data() as Conversation;
      if (conv.participantIds.includes(data.sellerId)) {
          existingConversation = { id: docSnap.id, ...conv };
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
    productSellerId: productSellerId, // Store the seller's ID for easy access
    createdAt: serverTimestamp(),
    lastMessage: {
        text: `Conversation about "${data.productTitle}" started.`,
        senderId: 'system',
        timestamp: serverTimestamp()
    },
  });

  return { conversationId: conversationRef.id, isNew: true };
}


export function streamConversations(userId: string, callback: (conversations: Conversation[]) => void): () => void {
  if (!userId) {
    callback([]);
    return () => {}; // Return an empty function if no user
  }
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessage.timestamp', 'desc')
  );

  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const convsWithDetails: Conversation[] = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const conv = { id: docSnap.id, ...docSnap.data() } as Conversation;
        const otherId = conv.participantIds.find(id => id !== userId);
        if (otherId) {
          const userDocSnap = await getDocClient(doc(db, 'users', otherId));
          if (userDocSnap.exists()) {
            conv.otherParticipant = { id: userDocSnap.id, uid: userDocSnap.id, ...userDocSnap.data() } as User;
          }
        }
        return conv;
      })
    );
    callback(convsWithDetails);
  }, (error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        console.warn("Firestore permission denied on conversations stream. This is normal on logout.");
        // We will now let the component handle the unsubscription
      } else {
        console.error("Error in streamConversations:", error);
      }
  });

  return unsubscribe;
}


export async function getConversation(conversationId: string, currentUserId: string): Promise<{ conversation: Conversation, otherParticipant: User } | null> {
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDocClient(convRef);

    if (!convSnap.exists()) return null;
    
    const conversation = { id: convSnap.id, ...convSnap.data() } as Conversation;

    if (!conversation.participantIds.includes(currentUserId)) {
        // Security check
        return null;
    }

    const otherId = conversation.participantIds.find(id => id !== currentUserId);
    if (!otherId) return null;

    const userSnap = await getDocClient(doc(db, 'users', otherId));
    if (!userSnap.exists()) return null;

    const otherParticipant = { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;

    return { conversation, otherParticipant };
}


export function streamMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(messageDoc => ({ id: messageDoc.id, ...messageDoc.data() } as Message));
        callback(messages);
    }, (error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        console.warn("Firestore permission denied on messages stream. This is normal on logout.");
        // Let the component handle unsubscription
      } else {
        console.error("Error in streamMessages:", error);
      }
    });

    return unsubscribe;
}

export async function sendMessage(conversationId: string, senderId: string, text: string, options?: { offerId?: string; isQuoteRequest?: boolean, offerStatusUpdate?: OfferStatusUpdate }): Promise<void> {
    let modifiedMessage = text;
    if (!options?.isQuoteRequest && !options?.offerStatusUpdate) {
        try {
            const result = await filterContactDetails({ message: text });
            modifiedMessage = result.modifiedMessage;
        } catch (error) {
            console.error("AI contact filtering failed. Sending original message.", error);
        }
    }

    if (modifiedMessage.trim().length === 0 && !options?.offerId && !options?.offerStatusUpdate) {
        console.log("Message was fully redacted. Not sending.");
        return;
    }
    
    const batch = writeBatch(db);
    const conversationRef = doc(db, 'conversations', conversationId);
    const messageRef = doc(collection(conversationRef, 'messages'));
    
    const newMessage: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        text: modifiedMessage,
        timestamp: serverTimestamp() as Timestamp,
    };

    if (options?.offerId) {
        newMessage.offerId = options.offerId;
    }
    if (options?.isQuoteRequest) {
        newMessage.isQuoteRequest = true;
    }
    if (options?.offerStatusUpdate) {
        newMessage.offerStatusUpdate = options.offerStatusUpdate;
    }

    let lastMessageText = modifiedMessage;
    if (options?.offerId) {
        lastMessageText = "An offer was sent.";
    } else if (options?.offerStatusUpdate) {
        lastMessageText = `Offer ${options.offerStatusUpdate.status}.`;
    }

    const lastMessageUpdate = {
        lastMessage: {
            text: lastMessageText,
            senderId,
            timestamp: serverTimestamp()
        }
    };
    
    batch.set(messageRef, newMessage);
    batch.update(conversationRef, lastMessageUpdate);

    await batch.commit();
}


// --- Offer Functions ---
export async function createOffer(data: {
    productId: string;
    quantity: number;
    pricePerUnit: number;
    notes?: string;
    conversationId: string;
    buyerId: string;
    sellerId: string;
}): Promise<Offer> {
    const productSnap = await getDocClient(doc(db, "products", data.productId));
    if (!productSnap.exists()) {
        throw new Error("Product not found to create offer.");
    }
    const product = productSnap.data() as Product;

    const newOfferData: Omit<Offer, 'id'> = {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        productTitle: product.title,
        productImage: product.images?.[0] || '',
    };
    
    const offerRef = await addDoc(collection(db, "offers"), newOfferData);
    
    // Now send the message with the ID of the created offer
    await sendMessage(data.conversationId, data.sellerId, `I've sent a formal offer for ${data.quantity} x ${product.title}.`, { offerId: offerRef.id });

    const newOfferSnap = await getDocClient(offerRef);
    return { id: newOfferSnap.id, ...newOfferSnap.data() } as Offer;
}

export async function getOfferClient(offerId: string): Promise<Offer | null> {
    const offerRef = doc(db, 'offers', offerId);
    const offerSnap = await getDocClient(offerRef);

    if (!offerSnap.exists()) {
        return null;
    }

    const offerData = offerSnap.data();
    // Manually convert Timestamps to serializable format
    const serializableData = convertTimestamps(offerData);

    return { id: offerSnap.id, ...serializableData } as Offer;
}

export async function updateOfferStatusClient(
    offerId: string, 
    status: 'accepted' | 'declined', 
    currentUserId: string
): Promise<void> {
    const offerRef = doc(db, 'offers', offerId);
    const offerSnap = await getDocClient(offerRef);

    if (!offerSnap.exists()) {
        throw new Error("Offer not found.");
    }

    const offer = offerSnap.data() as Offer;

    if (offer.buyerId !== currentUserId) {
        throw new Error("You are not authorized to update this offer.");
    }
    
    if (offer.status !== 'pending') {
        throw new Error(`This offer is already ${offer.status} and cannot be changed.`);
    }

    await updateDoc(offerRef, {
        status,
        updatedAt: serverTimestamp(),
    });
    
    // Send a notification message to the chat
    const notificationText = `I have ${status} the offer for "${offer.productTitle}".`;
    await sendMessage(offer.conversationId, currentUserId, notificationText, { 
        offerStatusUpdate: { 
            offerId: offerId, 
            status: status 
        } 
    });
}


export async function sendQuoteRequest(data: {
    buyerId: string;
    sellerId: string;
    productId: string;
    productTitle: string;
    productImage: string;
    quantity: number;
    requirements: string;
}): Promise<string> {
    const { conversationId } = await findOrCreateConversation({
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        productId: data.productId,
        productTitle: data.productTitle,
        productImage: data.productImage,
    });

    let safeRequirements = data.requirements;
    if (data.requirements.trim()) {
        try {
            const result = await filterContactDetails({ message: data.requirements });
            safeRequirements = result.modifiedMessage;
        } catch (error) {
            console.error("AI contact filtering failed for quote request. Sending original message.", error);
        }
    }

    const formattedMessage = `&lt;b&gt;New Quote Request&lt;/b&gt;&lt;br/&gt;&lt;b&gt;Product:&lt;/b&gt; ${data.productTitle}&lt;br/&gt;&lt;b&gt;Quantity:&lt;/b&gt; ${data.quantity}&lt;br/&gt;&lt;br/&gt;&lt;b&gt;Buyer's Message:&lt;/b&gt;&lt;br/&gt;${safeRequirements}`;
    
    await sendMessage(conversationId, data.buyerId, formattedMessage, { isQuoteRequest: true });

    return conversationId;
}


// --- Admin Client Functions ---

export async function getAllConversationsForAdminClient(): Promise<Conversation[]> {
    const snapshot = await getDocs(query(collection(db, 'conversations'), orderBy('lastMessage.timestamp', 'desc')));
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Conversation));
}

export async function getConversationForAdminClient(conversationId: string): Promise<Conversation | null> {
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDocClient(convRef);
    if (!convSnap.exists()) {
        return null;
    }
    return { id: convSnap.id, ...convSnap.data() } as Conversation;
}

export function streamMessagesForAdmin(conversationId: string, callback: (messages: Message[]) => void): () => void {
    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(messageDoc => ({ id: messageDoc.id, ...messageDoc.data() } as Message));
        callback(messages);
    }, (error: FirestoreError) => {
      if (error.code === 'permission-denied') {
        console.warn("Firestore permission denied on admin messages stream. This is normal if rules are not yet applied.");
      } else {
        console.error("Error in streamMessagesForAdmin:", error);
      }
    });

    return unsubscribe;
}

// --- Admin Settings ---

export async function getProductUpdateRulesClient(): Promise<string[]> {
    const docRef = doc(db, 'settings', 'productUpdateRules');
    const docSnap = await getDocClient(docRef);
    if (docSnap.exists()) {
        return docSnap.data().autoApproveFields || [];
    }
    return [];
}

export async function saveProductUpdateRulesClient(fields: string[]): Promise<void> {
    const docRef = doc(db, 'settings', 'productUpdateRules');
    await setDoc(docRef, { autoApproveFields: fields });
}


export { app, auth, db, storage };
