
"use client";

import { useState, useEffect } from 'react';
import { Product, Category } from '@/lib/types';
import { getProductsClient, getCategoriesClient } from '@/lib/firebase';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch all categories to display in the sidebar
        const allCategories = await getCategoriesClient();
        const activeCategoryIds = new Set(allCategories.filter(c => c.status === 'active').map(c => c.id));

        // Fetch all approved products
        const allApprovedProducts = await getProductsClient();

        // Filter products to only include those in an active category
        const activeProducts = allApprovedProducts.filter(p => {
            let currentId: string | null | undefined = p.categoryId;
            if (!currentId) return false; // Ensure product has a category

            const categoryMap = new Map(allCategories.map(c => [c.id, c]));
            
            // Check if the product's direct category is active
            if (activeCategoryIds.has(currentId)) {
                return true;
            }

            // Check if any parent category is active
            let parentId = categoryMap.get(currentId)?.parentId;
            while(parentId) {
                if (activeCategoryIds.has(parentId)) {
                    return true;
                }
                parentId = categoryMap.get(parentId)?.parentId;
            }
            return false;
        });
        
        setProducts(activeProducts);
        setCategories(allCategories);

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
