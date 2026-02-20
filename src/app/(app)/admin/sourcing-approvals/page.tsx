
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { SourcingRequest, User, Category } from '@/lib/types';
import { getPendingSourcingRequestsClient, getUsersClient, getCategoriesClient } from '@/lib/firebase';
import { SourcingApprovalsClientPage } from './client-page';
import { useToast } from '@/hooks/use-toast';

export default function AdminSourcingApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [pendingRequests, userList, categoryList] = await Promise.all([
            getPendingSourcingRequestsClient(),
            getUsersClient(),
            getCategoriesClient()
        ]);
        setRequests(pendingRequests);
        setUsers(userList);
        setCategories(categoryList);
      } catch (error) {
        console.error("Failed to fetch admin data for sourcing approvals:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load pending sourcing requests.'
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center h-full">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return <SourcingApprovalsClientPage initialRequests={requests} initialUsers={users} initialCategories={categories} />;
}
