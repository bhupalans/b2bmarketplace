
import { getUsers, getCategories } from "@/lib/database";
import { SourcingApprovalsClientPage } from './client-page';
import { adminDb } from "@/lib/firebase-admin";
import { SourcingRequest } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

async function getPendingSourcingRequests() {
    const snapshot = await adminDb.collection("sourcingRequests")
        .where("status", "==", "pending")
        .get();

    if (snapshot.empty) {
        return [];
    }
    
    // Sort in-memory after fetching
    const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        const request: SourcingRequest = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate().toISOString() : data.expiresAt,
        } as SourcingRequest;
        return request;
    });

    return requests.sort((a, b) => new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime());
}


export default async function AdminSourcingApprovalsPage() {

  const [requests, users, categories] = await Promise.all([
    getPendingSourcingRequests(),
    getUsers(),
    getCategories()
  ]);

  return <SourcingApprovalsClientPage initialRequests={requests} initialUsers={users} initialCategories={categories} />;
}
