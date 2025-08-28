
"use client";

import { useState, useEffect } from 'react';
import { Product, Category, User } from '@/lib/types';
import { getProductsClient, getCategoriesClient, getUsersClient } from '@/lib/firebase';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [productData, categoryData, userData] = await Promise.all([
          getProductsClient(),
          getCategoriesClient(),
          getUsersClient(),
        ]);
        setProducts(productData);
        setCategories(categoryData);
        setUsers(userData);
      } catch (err: any) {
        console.error("Error fetching data client-side:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { products, categories, users, loading, error };
}
