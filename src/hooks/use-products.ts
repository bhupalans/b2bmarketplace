
"use client";

import { useState, useEffect } from 'react';
import { Product, Category, User } from '@/lib/types';
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
        const [productData, categoryData] = await Promise.all([
          getProductsClient(),
          getCategoriesClient(),
        ]);
        setProducts(productData);
        setCategories(categoryData);
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
