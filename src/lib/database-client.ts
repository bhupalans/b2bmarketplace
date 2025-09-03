
"use client";

import {
  doc,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { mockCategories, mockProducts } from "./mock-data";
import { User } from "./types";

// This file contains a client-side function to seed the database.
// This is useful for avoiding server-side permission issues during initial setup.

export async function seedDatabaseClient() {
  console.log("Checking if database needs seeding from the client...");

  const seedCheckRef = doc(db, "internal", "seedStatus");
  const seedCheckSnap = await getDoc(seedCheckRef);

  if (seedCheckSnap.exists() && seedCheckSnap.data()?.completed) {
    console.log("Database already seeded. Skipping.");
    return { success: true, message: "Database has already been seeded." };
  }

  console.log("Seeding database with initial data from the client...");

  const batch = writeBatch(db);

  // 1. Seed Categories
  mockCategories.forEach((category) => {
    const docRef = doc(db, "categories", category.id);
    batch.set(docRef, category);
  });
  console.log("-> Prepared categories for seeding.");

  // 2. Seed Products
  mockProducts.forEach((product) => {
    const { id, ...productData } = product;
    const docRef = doc(db, "products", id);
    batch.set(docRef, { ...productData, status: "approved" });
  });
  console.log("-> Prepared products for seeding.");

  // 3. Seed the Admin User
  const adminUid = "mNLTRIhyPGeOxlUSUZGq2mgcCZF2"; // As specified by you
  const adminUser: Omit<User, "id"> = {
    uid: adminUid,
    email: "admin@b2b.com",
    name: "Admin",
    role: "admin",
    username: "admin",
    verified: true,
    avatar: `https://i.pravatar.cc/150?u=${adminUid}`,
  };
  const adminRef = doc(db, "users", adminUid);
  batch.set(adminRef, adminUser);
  console.log("-> Prepared admin user for seeding.");

  // 4. Mark seeding as complete
  batch.set(seedCheckRef, { completed: true, timestamp: new Date() });

  try {
    await batch.commit();
    console.log("Database seeding completed successfully from the client!");
    return { success: true, message: "Database seeded successfully." };
  } catch (error: any) {
    console.error("Error seeding database from client:", error);
    return {
      success: false,
      message:
        "Error seeding database. Check browser console and Firestore rules.",
    };
  }
}
