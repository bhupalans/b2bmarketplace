
import { getUsers, getCategories } from "@/lib/database";
import { SourcingApprovalsClientPage } from './client-page';
import { adminDb } from "@/lib/firebase-admin";
import { SourcingRequest } from "@/lib/types";
import { convertTimestamps } from "@/lib/firebase";

async function getPendingSourcingRequests() {
    const snapshot = await adminDb.collection("sourcingRequests")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .get();

    if (snapshot.empty) {
        return [];
    }
    
    return snapshot.docs.map(doc => {
        const data = convertTimestamps(doc.data());
        return { id: doc.id, ...data } as SourcingRequest;
    });
}


export default async function AdminSourcingApprovalsPage() {

  const [requests, users, categories] = await Promise.all([
    getPendingSourcingRequests(),
    getUsers(),
    getCategories()
  ]);

  return <SourcingApprovalsClientPage initialRequests={requests} initialUsers={users} initialCategories={categories} />;
}
