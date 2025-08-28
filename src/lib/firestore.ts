
import { collection, getDocs, doc, getDoc, writeBatch, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, orderBy, Timestamp, or } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, User, Message } from "./types";
import { mockProducts, mockCategories, mockOffers } from "./mock-data";

// Function to fetch all products
export async function getProducts(): Promise<Product[]> {
  const productsCol = collection(db, "products");
  const productSnapshot = await getDocs(productsCol);
  const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  return productList;
}

// Function to fetch a single product
export async function getProduct(productId: string): Promise<Product | null> {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) return null;
    return { id: productSnap.id, ...productSnap.data() } as Product;
}


// Function to fetch all categories
export async function getCategories(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const categorySnapshot = await getDocs(categoriesCol);
  const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  return categoryList;
}

// Function to fetch all users
export async function getUsers(): Promise<User[]> {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
  // Ensure the user object always has a `uid` property.
  // The document ID is the Firebase Auth UID.
  const userList = userSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      uid: doc.id, // Use the document ID as the canonical UID.
    } as User;
  });
  return userList;
}

// Function to get messages between two users with a real-time listener
export function getMessages(userId: string, otherUserId: string, callback: (messages: Message[]) => void): () => void {
  const messagesRef = collection(db, 'messages');
  
  const participants = [userId, otherUserId].sort();
  
  const q = query(messagesRef, 
    where('participants', '==', participants),
    orderBy('timestamp', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toMillis() || Date.now(),
      } as Message);
    });
      
    callback(messages);
  }, (error) => {
    console.error("Firestore snapshot error:", error);
  });

  return unsubscribe;
}


// Function to fetch a single product and its seller
export async function getProductAndSeller(productId: string): Promise<{ product: Product; seller: User | null } | null> {
  const productRef = doc(db, "products", productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    return null;
  }

  const product = { id: productSnap.id, ...productSnap.data() } as Product;
  
  let seller: User | null = null;
  if (product.sellerId) {
    try {
      const sellerRef = doc(db, "users", product.sellerId);
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
        const sellerData = sellerSnap.data();
        seller = { id: sellerSnap.id, ...sellerData, uid: sellerSnap.id } as User;
      }
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}. This might be due to Firestore security rules.`, error);
        seller = null;
    }
  }

  return { product, seller };
}

// Function to fetch a single seller and their products
export async function getSellerAndProducts(sellerId: string): Promise<{ seller: User; products: Product[] } | null> {
  const sellerRef = doc(db, "users", sellerId);
  const sellerSnap = await getDoc(sellerRef);

  if (!sellerSnap.exists() || sellerSnap.data().role !== 'seller') {
    return null;
  }

  const sellerData = sellerSnap.data();
  const seller = { id: sellerSnap.id, ...sellerData, uid: sellerSnap.id } as User;

  const productsQuery = query(collection(db, "products"), where("sellerId", "==", sellerId));
  const productsSnapshot = await getDocs(productsQuery);
  const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

  return { seller, products };
}

// Function to get all products for a specific seller
export async function getSellerProducts(sellerId: string): Promise<Product[]> {
    const q = query(collection(db, "products"), where("sellerId", "==", sellerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}


// Function to get the category path for breadcrumbs
export async function getCategoryPath(categoryId: string): Promise<Category[]> {
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

// Function to get dashboard data for a seller
export async function getSellerDashboardData(sellerId: string): Promise<{
  totalRevenue: number;
  acceptedOffersCount: number;
  totalProducts: number;
  productsWithOfferCounts: (Product & { offerCount: number })[];
} | null> {
  try {
    const sellerProducts = mockProducts.filter(p => p.sellerId === sellerId);
    const sellerProductIds = sellerProducts.map(p => p.id);

    const relevantOffers = Object.values(mockOffers).filter(o => sellerProductIds.includes(o.productId));

    const acceptedOffers = relevantOffers.filter(o => o.status === 'accepted');
    const totalRevenue = acceptedOffers.reduce((sum, offer) => sum + (offer.pricePerUnit * offer.quantity), 0);
    const acceptedOffersCount = acceptedOffers.length;

    const productsWithOfferCounts = sellerProducts.map(product => {
      const offerCount = relevantOffers.filter(o => o.productId === product.id).length;
      return { ...product, offerCount };
    }).sort((a, b) => b.offerCount - a.offerCount);


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

// Function to create or update a product
export async function createOrUpdateProduct(
  productData: Omit<Product, 'id'>,
  productId?: string
): Promise<Product> {
  if (productId) {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, productData);
    return { id: productId, ...productData };
  } else {
    const docRef = await addDoc(collection(db, 'products'), productData);
    return { id: docRef.id, ...productData };
  }
}

// Function to delete a product
export async function deleteProduct(productId: string): Promise<void> {
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}


// --- Seeding Function ---
export async function seedDatabase() {
  const batch = writeBatch(db);

  const productsSnapshot = await getDocs(collection(db, "products"));
  if (productsSnapshot.empty) {
    console.log("Seeding products...");
    mockProducts.forEach((product) => {
      const docRef = doc(db, "products", product.id);
      batch.set(docRef, product);
    });
  } else {
    console.log("Products collection is not empty. Skipping seed.");
  }

  const categoriesSnapshot = await getDocs(collection(db, "categories"));
  if (categoriesSnapshot.empty) {
    console.log("Seeding categories...");
    mockCategories.forEach((category) => {
      const docRef = doc(db, "categories", category.id);
      batch.set(docRef, category);
    });
  } else {
     console.log("Categories collection is not empty. Skipping seed.");
  }
  
  try {
    await batch.commit();
    console.log("Database seeded successfully!");
    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Error seeding database: ", error);
    return { success: false, message: "Error seeding database." };
  }
}
