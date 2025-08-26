import { collection, getDocs, doc, getDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { Product, Category, User } from "./types";
import { mockProducts, mockCategories } from "./mock-data";

// Function to fetch all products
export async function getProducts(): Promise<Product[]> {
  const productsCol = collection(db, "products");
  const productSnapshot = await getDocs(productsCol);
  const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  return productList;
}

// Function to fetch all categories
export async function getCategories(): Promise<Category[]> {
  const categoriesCol = collection(db, "categories");
  const categorySnapshot = await getDocs(categoriesCol);
  const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  return categoryList;
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
        seller = { id: sellerSnap.id, ...sellerSnap.data() } as User;
      }
    } catch (error) {
        console.error(`Failed to fetch seller data for product ${productId}. This might be due to Firestore security rules.`, error);
        // If fetching the seller fails (e.g., due to permissions for a public user),
        // we'll proceed without the seller data instead of crashing the page.
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

  const seller = { id: sellerSnap.id, ...sellerSnap.data() } as User;

  const productsQuery = query(collection(db, "products"), where("sellerId", "==", sellerId));
  const productsSnapshot = await getDocs(productsQuery);
  const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

  return { seller, products };
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


// --- Seeding Function ---
// This is a one-time function to populate the database with mock data.
export async function seedDatabase() {
  const batch = writeBatch(db);

  // Check if products are already seeded
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

  // Check if categories are already seeded
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
