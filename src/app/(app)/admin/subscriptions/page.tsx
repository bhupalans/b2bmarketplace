
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { SubscriptionPlan, User } from '@/lib/types';
import { getSubscriptionPlansClient, getUsersClient } from '@/lib/firebase';
import { SubscriptionsClientPage } from './client-page';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedPlans, fetchedUsers] = await Promise.all([
            getSubscriptionPlansClient(),
            getUsersClient(),
        ]);
        setPlans(fetchedPlans);
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to fetch subscription data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user]);

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

  return <SubscriptionsClientPage initialPlans={plans} initialUsers={users} />;
}
