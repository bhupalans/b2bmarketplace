
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { SpecTemplate } from '@/lib/types';
import { getSpecTemplatesClient } from '@/lib/firebase';
import { SpecTemplatesClientPage } from './client-page';

export default function SpecTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchedTemplates = await getSpecTemplatesClient();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch spec templates:", error);
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

  return <SpecTemplatesClientPage initialTemplates={templates} />;
}
