

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc, getDoc as getDocClient, Timestamp, writeBatch, serverTimestamp, orderBy, onSnapshot, limit, FirestoreError, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product, Category, User, SpecTemplate, SpecTemplateField, Conversation, Message, Offer, OfferStatusUpdate, VerificationTemplate, VerificationField, SourcingRequest, Question, Answer, AppNotification, SubscriptionPlan, PaymentGateway, SubscriptionInvoice, BrandingSettings } from './types';
import { v4 as uuidv4 } from 'uuid';
import { moderateMessageContent } from '@/ai/flows/moderate-message-content';
import { sendQuestionAnsweredEmail, sendProductApprovedEmail, sendProductRejectedEmail, sendUserVerifiedEmail, sendUserRejectedEmail, sendSourcingRequestSubmittedEmail, sendSourcingRequestApprovedEmail, sendSourcingRequestRejectedEmail } from '@/services/email';

const firebaseConfig = {
  apiKey: "AIzaSyDL_o5j6RtqjCwFN5iTtvUj6nFfyDJaaxc",
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
export const convertTimestamps = (data: any): any => {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }

    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }

    if (typeof data === 'object' && !(data instanceof Date)) {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertTimestamps(data[key]);
        }
        return res;
    }

    return data;
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

export async function getProductAndSellerClient(productId: string): Promise<{ product: Product; seller: User | null; similarProducts: Product[]; sellerProducts: Product[] } | null> {
  const product = await getProductClient(productId);
  if (!product || product.status !== 'approved') {
    return null;
  }
  
  let seller: User | null = null;
  if (product.sellerId) {
    try {
        seller = await getUserClient(product.sellerId);
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}.`, error);
        seller = null;
    }
  }

  // Fetch similar products (same category, different product)
  const similarProductsQuery = query(
    collection(db, "products"),
    where("categoryId", "==", product.categoryId),
    where("status", "==", "approved"),
    limit(4) // Fetch a bit more to account for the current product
  );
  const similarSnapshot = await getDocs(similarProductsQuery);
  const similarProducts = similarSnapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Product))
    .filter(p => p.id !== productId) // Exclude the current product
    .slice(0, 3); // Take the first 3

  // Fetch other products from the same seller
  let sellerProducts: Product[] = [];
  if (product.sellerId) {
    const sellerProductsQuery = query(
      collection(db, "products"),
      where("sellerId", "==", product.sellerId),
      where("status", "==", "approved"),
      limit(4)
    );
    const sellerSnapshot = await getDocs(sellerProductsQuery);
    sellerProducts = sellerSnapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Product))
      .filter(p => p.id !== productId)
      .slice(0, 3);
  }

  return { product, seller, similarProducts, sellerProducts };
}

export async function getSellerAndProductsClient(sellerId: string): Promise<{ seller: User; products: Product[] } | null> {
  const seller = await getUserClient(sellerId);
  
  if (!seller) {
    return null;
  }

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
  return categorySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Category));
}

export async function getActiveCategoriesClient(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const q = query(categoriesCol, where("status", "==", "active"));
  const categorySnapshot = await getDocs(q);
  return categorySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Category));
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

export async function getUserClient(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDocClient(userRef);

    if (!userSnap.exists()) {
        return null;
    }
    const userData = userSnap.data();

    // If the user has a subscription plan ID, fetch the plan details
    if (userData.subscriptionPlanId) {
        const planRef = doc(db, 'subscriptionPlans', userData.subscriptionPlanId);
        const planSnap = await getDocClient(planRef);
        if (planSnap.exists()) {
            userData.subscriptionPlan = { id: planSnap.id, ...planSnap.data() } as SubscriptionPlan;
        }
    }

    const serializableUserData = convertTimestamps(userData);
    return { id: userSnap.id, uid: userSnap.id, ...serializableUserData } as User;
}

export async function getUsersByIdsClient(userIds: string[]): Promise<Map<string, User>> {
    if (userIds.length === 0) {
        return new Map();
    }
    const userMap = new Map<string, User>();
    // Firestore 'in' queries are limited to 30 items. For a larger app, this would need to chunking.
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

    const productPromises = querySnapshot.docs.map(async (docSnap) => {
        const product = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Product;
        
        // Fetch unanswered questions count for each product
        const questionsRef = collection(db, "products", product.id, "questions");
        const unansweredQuery = query(questionsRef, where("answer", "==", null));
        const unansweredSnapshot = await getDocs(unansweredQuery);
        product.unansweredQuestions = unansweredSnapshot.size;
        
        return product;
    });

    const products = await Promise.all(productPromises);
    
    return products.sort((a,b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
    });
}

// Client-side function to update product status, to be secured by Firestore rules
export async function updateProductStatus(
  productId: string,
  status: 'approved' | 'rejected',
  reason?: string,
): Promise<void> {
  const productRef = doc(db, 'products', productId);
  
  // First, update the document status
  await updateDoc(productRef, { status });

  // Then, fetch the updated product and seller to send an email notification
  try {
      const productSnap = await getDocClient(productRef);
      if (productSnap.exists()) {
          const product = { id: productSnap.id, ...convertTimestamps(productSnap.data()) } as Product;
          const seller = await getUserClient(product.sellerId);
          
          if (seller) {
              if (status === 'approved') {
                  await sendProductApprovedEmail({ seller, product });
              } else if (status === 'rejected') {
                  const serializableProduct = {
                    ...product,
                    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
                    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
                  };
                  await sendProductRejectedEmail({ 
                      seller, 
                      product: serializableProduct, 
                      reason: reason || "Your product did not meet our listing guidelines. Please review and resubmit." 
                  });
              }
          }
      }
  } catch (emailError) {
      console.error("Failed to send product status notification email:", emailError);
  }
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
  productFormData: Omit<Product, 'id' | 'images' | 'status' | 'sellerId' | 'createdAt' | 'updatedAt' | 'unansweredQuestions'> & {
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
            'title', 'description', 'price', 'categoryId', 'countryOfOrigin',
            'stockAvailability', 'moq', 'moqUnit', 'sku', 'leadTime', 'specifications'
        ];

        for (const key of editableFields) {
          const originalValue = originalProduct[key as keyof Product];
          let submittedValue = productFormData[key as keyof typeof productFormData];

          let isEqual = false;
          if (key === 'price') {
             isEqual = originalValue?.baseAmount === submittedValue?.baseAmount && originalValue?.baseCurrency === submittedValue?.baseCurrency;
          } else if (key === 'specifications') {
             isEqual = areSpecificationsEqual(originalValue, submittedValue as any);
          } else {
             const normalizedOriginal = (originalValue === null || originalValue === undefined) ? "" : originalValue;
             const normalizedSubmitted = (submittedValue === null || submittedValue === undefined) ? "" : submittedValue;
             isEqual = String(normalizedOriginal) === String(normalizedSubmitted);
          }

          if (!isEqual) {
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
    productId?: string;
    productTitle?: string;
    productImage?: string;
    sourcingRequestId?: string;
    sourcingRequestTitle?: string;
}): Promise<{ conversationId: string, isNew: boolean }> {

  const hasProduct = !!data.productId;
  const hasSourcingRequest = !!data.sourcingRequestId;

  let conversationQuery;

  if (hasProduct) {
     conversationQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', data.buyerId),
        where('productId', '==', data.productId)
      );
  } else if (hasSourcingRequest) {
      conversationQuery = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', data.sellerId),
        where('sourcingRequestId', '==', data.sourcingRequestId)
      );
  } else {
    throw new Error("A conversation must be linked to a product or a sourcing request.");
  }


  const querySnapshot = await getDocs(conversationQuery);
  let existingConversation: (Conversation & { id: string }) | null = null;

  const otherParticipantId = hasProduct ? data.sellerId : data.buyerId;

  querySnapshot.forEach(docSnap => {
      const conv = docSnap.data() as Conversation;
      if (conv.participantIds.includes(otherParticipantId)) {
          existingConversation = { id: docSnap.id, ...conv };
      }
  });
  
  if (existingConversation) {
    return { conversationId: existingConversation.id, isNew: false };
  }
  
  const conversationData: Partial<Conversation> = {
    participantIds: [data.buyerId, data.sellerId],
    createdAt: serverTimestamp() as Timestamp,
    lastMessage: null,
  };

  if (hasProduct) {
    const productSnap = await getDocClient(doc(db, "products", data.productId!));
    if (!productSnap.exists()) {
        throw new Error("Cannot start conversation: Product does not exist.");
    }
    const productData = productSnap.data();
    conversationData.productId = data.productId;
    conversationData.productTitle = data.productTitle;
    conversationData.productImage = data.productImage;
    conversationData.productSellerId = productData.sellerId;
    conversationData.lastMessage = {
        text: `Conversation about "${data.productTitle}" started.`,
        senderId: 'system',
        timestamp: serverTimestamp() as Timestamp
    };
  } else if (hasSourcingRequest) {
    conversationData.sourcingRequestId = data.sourcingRequestId;
    conversationData.sourcingRequestTitle = data.sourcingRequestTitle;
    conversationData.lastMessage = {
        text: `Response to sourcing request: "${data.sourcingRequestTitle}"`,
        senderId: 'system',
        timestamp: serverTimestamp() as Timestamp
    };
  }
  
  const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);

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
            const result = await moderateMessageContent({ message: text });
            modifiedMessage = result.modifiedMessage;
        } catch (error) {
            console.error("AI content moderation failed. Sending original message.", error);
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
    price: { baseAmount: number; baseCurrency: string };
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
        productId: data.productId,
        quantity: data.quantity,
        price: data.price,
        notes: data.notes,
        status: 'pending',
        sellerId: data.sellerId,
        buyerId: data.buyerId,
        conversationId: data.conversationId,
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

export async function sendQuoteForSourcingRequest(data: {
    sellerId: string;
    buyerId: string;
    sourcingRequestId: string;
    sourcingRequestTitle: string;
    message: string;
}): Promise<string> {
    const { conversationId } = await findOrCreateConversation({
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        sourcingRequestId: data.sourcingRequestId,
        sourcingRequestTitle: data.sourcingRequestTitle,
    });

    let safeMessage = data.message;
    if (data.message.trim()) {
        try {
            const result = await moderateMessageContent({ message: data.message });
            safeMessage = result.modifiedMessage;
        } catch (error) {
            console.error("AI content moderation failed for quote response. Sending original message.", error);
        }
    }

    const formattedMessage = `<b>Quote for Sourcing Request:</b> ${data.sourcingRequestTitle}<br/><br/><b>Seller's Message:</b><br/>${safeMessage}`;
    
    await sendMessage(conversationId, data.sellerId, formattedMessage, { isQuoteRequest: true });

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

export async function getPendingVerificationsClient(): Promise<User[]> {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("verificationStatus", "==", "pending"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, uid: docSnap.id, ...convertTimestamps(docSnap.data()) } as User));
}

export async function updateUserVerificationStatusClient(
  userId: string,
  status: 'verified' | 'rejected',
  reason?: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const dataToUpdate: { 
      verificationStatus: 'verified' | 'rejected';
      verified: boolean;
      verificationRejectionReason?: string;
  } = { 
      verificationStatus: status,
      verified: status === 'verified'
  };

  if (status === 'rejected') {
    dataToUpdate.verificationRejectionReason = reason;
  } else {
    // Clear the reason if they are approved
    dataToUpdate.verificationRejectionReason = '';
  }

  await updateDoc(userRef, dataToUpdate);

  try {
    const userSnap = await getDocClient(userRef);
    if (userSnap.exists()) {
      const user = { id: userSnap.id, ...convertTimestamps(userSnap.data()) } as User;
      
      if (status === 'verified') {
        await sendUserVerifiedEmail({ user });
      } else if (status === 'rejected') {
        await sendUserRejectedEmail({
          user,
          reason: reason || "Your verification documents could not be approved. Please review and re-submit.",
        });
      }
    }
  } catch (emailError) {
    console.error("Failed to send user verification status email:", emailError);
  }
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

export async function getBrandingSettingsClient(): Promise<BrandingSettings> {
    const docRef = doc(db, 'settings', 'branding');
    const docSnap = await getDocClient(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as BrandingSettings;
    }
    return {};
}

export async function saveBrandingSettingsClient(settings: BrandingSettings): Promise<void> {
    const docRef = doc(db, 'settings', 'branding');
    await setDoc(docRef, settings, { merge: true });
}

// --- Payment Gateway Functions ---

export async function getPaymentGatewaysClient(): Promise<PaymentGateway[]> {
    const snapshot = await getDocs(collection(db, "paymentGateways"));
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentGateway));
}

export async function getActivePaymentGatewaysClient(): Promise<PaymentGateway[]> {
    const q = query(collection(db, "paymentGateways"), where("enabled", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PaymentGateway));
}

export async function createOrUpdatePaymentGatewayClient(gateway: Omit<PaymentGateway, 'id'>, id: string): Promise<PaymentGateway> {
    const docRef = doc(db, "paymentGateways", id);
    await setDoc(docRef, gateway, { merge: true });
    return { id, ...gateway };
}

export async function deletePaymentGatewayClient(id: string): Promise<void> {
    await deleteDoc(doc(db, "paymentGateways", id));
}

// --- Sourcing Request Functions ---

export async function getPendingSourcingRequestsClient(): Promise<SourcingRequest[]> {
    const requestsRef = collection(db, "sourcingRequests");
    const q = query(requestsRef, where("status", "==", "pending"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as SourcingRequest));
}


export async function createSourcingRequestClient(
    requestData: Omit<SourcingRequest, 'id' | 'buyerId' | 'buyerName' | 'buyerCountry' | 'status' | 'createdAt' | 'targetPrice'> & { targetPrice?: { baseAmount: number; baseCurrency: string; } },
    buyer: User
): Promise<SourcingRequest> {
    if (!buyer.address?.country) {
        throw new Error("Please complete your primary business address in your profile before posting a request.");
    }
    
    const newRequestData: Omit<SourcingRequest, 'id'> = {
        ...requestData,
        buyerId: buyer.uid,
        buyerName: buyer.companyName || buyer.name,
        buyerCountry: buyer.address.country,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
    };
    
    const docRef = await addDoc(collection(db, "sourcingRequests"), newRequestData);
    const newDocSnap = await getDocClient(docRef);
    const createdRequest = { id: docRef.id, ...convertTimestamps(newDocSnap.data()) } as SourcingRequest;

    // Send email to admin, passing only primitive data
    await sendSourcingRequestSubmittedEmail({
      request: {
        id: createdRequest.id,
        title: createdRequest.title,
      },
      buyer,
      isUpdate: false,
    });
    
    return createdRequest;
}

export async function getSourcingRequestsClient(filters?: { buyerId?: string }): Promise<SourcingRequest[]> {
    const requestsRef = collection(db, "sourcingRequests");
    let q;

    if (filters?.buyerId) {
        // This query fetches all requests for a specific buyer, regardless of status/expiry.
        q = query(requestsRef, where("buyerId", "==", filters.buyerId), orderBy("createdAt", "desc"));
    } else {
        // This is the public query for browsing active sourcing requests.
        q = query(requestsRef, where("status", "==", "active"), where("expiresAt", ">", new Date()), orderBy("expiresAt", "asc"));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as SourcingRequest));
}


export async function getSourcingRequestClient(id: string): Promise<SourcingRequest | null> {
    const requestRef = doc(db, 'sourcingRequests', id);
    const docSnap = await getDocClient(requestRef);
    if (!docSnap.exists()) {
        return null;
    }
    return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as SourcingRequest;
}

export async function updateSourcingRequestClient(
    requestId: string, 
    requestData: Partial<Omit<SourcingRequest, 'id' | 'buyerId' | 'buyerName' | 'buyerCountry' | 'createdAt'>>
): Promise<SourcingRequest> {
    const requestRef = doc(db, 'sourcingRequests', requestId);
    
    const dataToUpdate: any = {
        ...requestData,
        status: 'pending', // Re-submit for review on edit
        updatedAt: serverTimestamp(),
    };
    
    await updateDoc(requestRef, dataToUpdate);

    const updatedDoc = await getDocClient(requestRef);
    const updatedRequest = { id: updatedDoc.id, ...convertTimestamps(updatedDoc.data()) } as SourcingRequest;

    // Send email notification to admin about the update
    const buyer = await getUserClient(updatedRequest.buyerId);
    if (buyer) {
        await sendSourcingRequestSubmittedEmail({ request: {id: updatedRequest.id, title: updatedRequest.title}, buyer, isUpdate: true });
    }

    return updatedRequest;
}

export async function updateSourcingRequestStatus(
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string
): Promise<void> {
  const requestRef = doc(db, 'sourcingRequests', requestId);
  const updateData: { status: 'active' | 'closed'; rejectionReason?: any } = {
    status: action === 'approve' ? 'active' : 'closed',
  };

  if (action === 'reject') {
    updateData.rejectionReason = reason || '';
  }

  await updateDoc(requestRef, updateData);

  try {
    const requestSnap = await getDocClient(requestRef);
    if (requestSnap.exists()) {
      const request = { id: requestSnap.id, ...convertTimestamps(requestSnap.data()) } as SourcingRequest;
      const buyer = await getUserClient(request.buyerId);

      if (buyer) {
        if (action === 'approve') {
          await sendSourcingRequestApprovedEmail({ requestId: request.id, requestTitle: request.title, buyer });
        } else if (action === 'reject') {
          await sendSourcingRequestRejectedEmail({
            requestId: request.id,
            requestTitle: request.title,
            buyer,
            reason: reason || "Your request did not meet our guidelines.",
          });
          const notificationData = {
            userId: request.buyerId,
            message: `Your sourcing request "${request.title}" was rejected. Reason: ${reason}`,
            link: `/sourcing/my-requests`,
            read: false,
            createdAt: new Date().toISOString(),
          };
          await addDoc(collection(db, 'notifications'), notificationData);
        }
      }
    }
  } catch (notificationError) {
    console.error("Failed to send sourcing request status notification:", notificationError);
  }
}


export async function closeSourcingRequestClient(requestId: string): Promise<void> {
  const requestRef = doc(db, 'sourcingRequests', requestId);
  await updateDoc(requestRef, { status: 'closed' });
}


export async function deleteSourcingRequestClient(requestId: string): Promise<void> {
  const requestRef = doc(db, 'sourcingRequests', requestId);
  await deleteDoc(requestRef);
}


// --- Q&A Functions ---

export async function getQuestionsForProductClient(productId: string): Promise<Question[]> {
  const questionsRef = collection(db, 'products', productId, 'questions');
  const q = query(questionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Question));
}

export async function addQuestionToProduct(
  productId: string,
  buyerId: string,
  buyerName: string,
  questionText: string
): Promise<Question> {
    const filtered = await moderateMessageContent({ message: questionText });

    const newQuestionData = {
        productId,
        buyerId,
        buyerName,
        text: filtered.modifiedMessage,
        createdAt: serverTimestamp() as Timestamp,
        answer: null,
    };
    
    const productQuestionsRef = collection(db, 'products', productId, 'questions');
    const docRef = await addDoc(productQuestionsRef, newQuestionData);
    const newDocSnap = await getDocClient(docRef);
    
    return { id: docRef.id, ...convertTimestamps(newDocSnap.data()) } as Question;
}

export async function addAnswerToQuestion(data: {
    productId: string;
    questionId: string;
    sellerId: string;
    sellerName: string;
    answerText: string;
}): Promise<Question> {
    const filtered = await moderateMessageContent({ message: data.answerText });
    
    const questionRef = doc(db, 'products', data.productId, 'questions', data.questionId);
    const questionSnap = await getDocClient(questionRef);
    if (!questionSnap.exists()) {
        throw new Error("Question not found.");
    }
    const question = questionSnap.data() as Question;


    const answerData: Answer = {
        text: filtered.modifiedMessage,
        sellerId: data.sellerId,
        sellerName: data.sellerName,
        answeredAt: serverTimestamp() as Timestamp,
    };

    // --- Notification Creation ---
    const notificationData: Omit<AppNotification, 'id'> = {
        userId: question.buyerId,
        message: `Your question on a product has been answered by ${data.sellerName}.`,
        link: `/products/${data.productId}`,
        read: false,
        createdAt: new Date().toISOString(),
    };
    const notificationRef = doc(collection(db, 'notifications'));
    // --- End Notification Creation ---

    const batch = writeBatch(db);
    batch.update(questionRef, { answer: answerData });
    batch.set(notificationRef, notificationData);

    await batch.commit();

    const updatedQuestionSnap = await getDocClient(questionRef);
    const finalQuestion = { id: updatedQuestionSnap.id, ...convertTimestamps(updatedQuestionSnap.data()) } as Question;
    
    // Send email after everything is committed
    const buyer = await getUserClient(question.buyerId);
    const product = await getProductClient(data.productId);

    if (buyer && product) {
        await sendQuestionAnsweredEmail({ buyer, product, question: finalQuestion });
    }

    return finalQuestion;
}

// --- Notification Functions ---

export function getNotificationsClient(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(30));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...convertTimestamps(docSnap.data()),
        } as AppNotification));
        callback(notifications);
    }, (error) => {
        console.error("Error fetching notifications:", error);
    });

    return unsubscribe;
}

export async function markNotificationAsReadClient(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
}

// --- Subscription Plan Client Functions ---

export async function getSubscriptionPlansClient(): Promise<SubscriptionPlan[]> {
  const plansCol = collection(db, "subscriptionPlans");
  const snapshot = await getDocs(plansCol);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as SubscriptionPlan));
}

export async function createOrUpdateSubscriptionPlanClient(
  planData: Partial<Omit<SubscriptionPlan, 'id'>>,
  planId?: string | null
): Promise<SubscriptionPlan> {
    const dataToSave: any = {
        name: planData.name,
        price: planData.price,
        currency: planData.currency,
        pricing: planData.pricing || [],
        type: planData.type,
        hasAnalytics: planData.hasAnalytics,
        isFeatured: planData.isFeatured,
        status: planData.status,
        updatedAt: Timestamp.now(),
    };

    if (planData.type === 'seller') {
        dataToSave.productLimit = planData.productLimit ?? 0;
        dataToSave.sourcingRequestLimit = null;
    } else if (planData.type === 'buyer') {
        dataToSave.sourcingRequestLimit = planData.sourcingRequestLimit ?? 0;
        dataToSave.productLimit = null;
    }


    if (planId) {
        const planRef = doc(db, 'subscriptionPlans', planId);
        await updateDoc(planRef, dataToSave);
        const updatedDoc = await getDocClient(planRef);
        return { id: planId, ...updatedDoc.data() } as SubscriptionPlan;
    } else {
        dataToSave.createdAt = Timestamp.now();
        const docRef = await addDoc(collection(db, 'subscriptionPlans'), dataToSave);
        const newDoc = await getDocClient(docRef);
        return { id: docRef.id, ...newDoc.data() } as SubscriptionPlan;
    }
}


export async function deleteSubscriptionPlanClient(planId: string): Promise<void> {
  if (!planId) {
    throw new Error("Plan ID is invalid.");
  }
  // To-do: Check if any user is subscribed to this plan before deleting.
  // For now, we will allow deletion.
  const planRef = doc(db, 'subscriptionPlans', planId);
  await deleteDoc(planRef);
}

// --- Invoice Functions ---
export async function getInvoicesForUserClient(userId: string): Promise<SubscriptionInvoice[]> {
  const invoicesRef = collection(db, 'subscriptionInvoices');
  const q = query(invoicesRef, where('userId', '==', userId), orderBy('invoiceDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...convertTimestamps(docSnap.data()) } as SubscriptionInvoice));
}


export { app, auth, db, storage };
