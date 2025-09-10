
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { User } from '@/lib/types';
import { getPendingVerificationsClient } from '@/lib/firebase';
import { AdminVerificationsClientPage } from './client-page';
import { useToast } from '@/hooks/use-toast';

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
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
        const fetchedUsers = await getPendingVerificationsClient();
        setPendingUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch pending verifications:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load pending verifications.'
        })
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

  return <AdminVerificationsClientPage initialUsers={pendingUsers} />;
}
