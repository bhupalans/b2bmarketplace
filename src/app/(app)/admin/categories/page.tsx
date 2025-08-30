
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import { Category, SpecTemplate } from '@/lib/types';
import { getCategoriesClient, getSpecTemplatesClient } from '@/lib/firebase';
import { CategoriesClientPage } from './client-page';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [specTemplates, setSpecTemplates] = useState<SpecTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role !== 'admin') {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [fetchedCategories, fetchedTemplates] = await Promise.all([
            getCategoriesClient(),
            getSpecTemplatesClient(),
        ]);
        setCategories(fetchedCategories);
        setSpecTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch admin data for categories page:", error);
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

  return <CategoriesClientPage initialCategories={categories} specTemplates={specTemplates} />;
}
