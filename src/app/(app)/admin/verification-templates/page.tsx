
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { VerificationTemplate } from '@/lib/types';
import { getVerificationTemplatesClient } from '@/lib/firebase';
import { VerificationTemplatesClientPage } from './client-page';

export default function VerificationTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<VerificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedTemplates = await getVerificationTemplatesClient();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch verification templates:", error);
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

  return <VerificationTemplatesClientPage initialTemplates={templates} />;
}
