
"use client";

import { useState, useEffect } from 'react';
import { Product, Category } from '@/lib/types';
import { getProductsClient, getActiveCategoriesClient } from '@/lib/firebase';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch only active categories
        const activeCategories = await getActiveCategoriesClient();
        const activeCategoryIds = new Set(activeCategories.map(c => c.id));

        // Fetch all approved products
        const allApprovedProducts = await getProductsClient();

        // Filter products to only include those in an active category
        const activeProducts = allApprovedProducts.filter(p => activeCategoryIds.has(p.categoryId));
        
        setProducts(activeProducts);
        setCategories(activeCategories);

      } catch (err: any) {
        console.error("Error fetching data client-side:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { products, categories, loading, error };
}
