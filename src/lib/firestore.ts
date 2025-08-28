
import { collection, getDocs, doc, getDoc, writeBatch, query, where, addDoc, updateDoc, deleteDoc, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, User, Message } from "./types";
import { mockProducts, mockCategories } from "./mock-data";

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

// Function to fetch a single user
export async function getUser(userId: string): Promise<User | null> {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    return { id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User;
}

// Function to fetch all users
export async function getUsers(): Promise<User[]> {
  const usersCol = collection(db, "users");
  const userSnapshot = await getDocs(usersCol);
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
        seller = await getUser(product.sellerId);
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}. This might be due to Firestore security rules.`, error);
        seller = null;
    }
  }

  return { product, seller };
}

// Function to fetch a single seller and their products
export async function getSellerAndProducts(sellerId: string): Promise<{ seller: User; products: Product[] } | null> {
  const seller = await getUser(sellerId);

  if (!seller || seller.role !== 'seller') {
    return null;
  }

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
    const sellerProducts = await getSellerProducts(sellerId);
    
    // This part is a mock as offers are not stored in the database.
    // In a real app, you would query an 'offers' collection.
    const acceptedOffersCount = 0; // Mock value
    const totalRevenue = 0; // Mock value

    const productsWithOfferCounts = sellerProducts.map(product => {
      return { ...product, offerCount: 0 }; // Mock value
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
