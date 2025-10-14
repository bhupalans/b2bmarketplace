
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { SourcingRequest, User, Category } from '@/lib/types';
import { getUsersClient, getCategoriesClient } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SourcingApprovalsClientPage } from './client-page';

export default function AdminSourcingApprovalsPage() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    const fetchStaticData = async () => {
        try {
            const [userList, categoryList] = await Promise.all([
                getUsersClient(),
                getCategoriesClient()
            ]);
            setUsers(userList);
            setCategories(categoryList);
        } catch (error) {
            console.error("Failed to fetch static admin data:", error);
        }
    };

    fetchStaticData();

    const q = query(collection(db, "sourcingRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const pendingRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SourcingRequest));
        setRequests(pendingRequests);
        setLoading(false);
    }, (error) => {
        console.error("Failed to subscribe to pending sourcing requests:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return <div className="flex justify-center items-center h-full"><p>You do not have permission to view this page.</p></div>;
  }

  return <SourcingApprovalsClientPage initialRequests={requests} initialUsers={users} initialCategories={categories} />;
}
