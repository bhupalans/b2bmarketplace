
"use client";

import React, { useState, useMemo } from "react";
import { ProductCard } from "@/components/product-card";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { CategorySidebar } from "@/components/category-sidebar";
import { mockProducts, mockCategories } from "@/lib/mock-data";
import { Category, Product } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Helper function to get all descendant category IDs
const getDescendantCategoryIds = (
  categoryId: string,
  allCategories: Category[]
): string[] => {
  const descendantIds: string[] = [];
  const queue = [categoryId];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId) {
      descendantIds.push(currentId);
      const children = allCategories.filter(c => c.parentId === currentId);
      children.forEach(child => queue.push(child.id));
    }
  }
  
  return descendantIds;
};


export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = useMemo(() => {
    let products = mockProducts;

    // Filter by category
    if (selectedCategoryId) {
      const categoryIdsToFilter = getDescendantCategoryIds(selectedCategoryId, mockCategories);
      products = products.filter((product) =>
        categoryIdsToFilter.includes(product.categoryId)
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      products = products.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return products;
  }, [selectedCategoryId, searchTerm]);
  
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
      <aside>
        <CategorySidebar
          categories={mockCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />
      </aside>
      <main className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Showing {filteredProducts.length} of {mockProducts.length} products
            </p>
          </div>
          <CurrencySwitcher />
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products by title or description..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
    </div>
  );
}
