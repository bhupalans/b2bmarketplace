
"use client";

import { getPendingProducts, getUsersClient } from '@/lib/firebase';
import { AdminApprovalsClientPage } from './client-page';
import { useEffect, useState } from 'react';
import { Product, User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AdminApprovalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();


  useEffect(() => {
    async function fetchData() {
        if (user?.role !== 'admin') {
            setLoading(false);
            return;
        }
      try {
        setLoading(true);
        const [pendingProducts, userList] = await Promise.all([
            getPendingProducts(),
            getUsersClient()
        ]);
        setProducts(pendingProducts);
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (user?.role !== 'admin') {
    return <div className="flex justify-center items-center h-full"><p>You do not have permission to view this page.</p></div>;
  }

  return <AdminApprovalsClientPage initialProducts={products} initialUsers={users} />;
}
