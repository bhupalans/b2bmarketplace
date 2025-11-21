
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ProductCard } from "@/components/product-card";
import { CategorySidebar } from "@/components/category-sidebar";
import { Category, Product } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useProducts } from "@/hooks/use-products";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useCurrency } from "@/contexts/currency-context";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { countries } from "@/lib/geography-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertPrice } from "@/lib/currency";

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
  const { products, categories, loading } = useProducts();
  const { currency, rates } = useCurrency();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [stockStatus, setStockStatus] = useState<string>('all');
  const [country, setCountry] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    const maxBasePrice = Math.max(...products.map(p => p.price.baseAmount));
    // A rough conversion for the slider max
    if (rates[currency]) {
        return Math.ceil(maxBasePrice * (rates[currency] || 1));
    }
    return maxBasePrice;
  }, [products, currency, rates]);

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    if (loading) {
      return [];
    }

    let filtered = products;

    // Filter by category
    if (selectedCategoryId) {
      const categoryIdsToFilter = getDescendantCategoryIds(selectedCategoryId, categories);
      filtered = filtered.filter((product) =>
        categoryIdsToFilter.includes(product.categoryId)
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by price range
    filtered = filtered.filter(product => {
        const convertedPriceValue = convertPrice(product.price, currency, rates);
        return convertedPriceValue >= priceRange[0] && convertedPriceValue <= priceRange[1];
    });

    // Filter by stock status
    if (stockStatus !== 'all') {
        filtered = filtered.filter(product => product.stockAvailability === stockStatus);
    }
    
    // Filter by country
    if (country !== 'all') {
        filtered = filtered.filter(product => product.countryOfOrigin === country);
    }

    // Sort products
    switch (sortBy) {
        case 'price_asc':
            filtered.sort((a,b) => convertPrice(a.price, currency, rates) - convertPrice(b.price, currency, rates));
            break;
        case 'price_desc':
            filtered.sort((a,b) => convertPrice(b.price, currency, rates) - convertPrice(a.price, currency, rates));
            break;
        case 'newest':
            filtered.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
            break;
    }


    return filtered;
  }, [selectedCategoryId, searchTerm, products, categories, loading, priceRange, stockStatus, country, sortBy, currency, rates]);
  
  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, maxPrice]);
    setStockStatus('all');
    setCountry('all');
    setSortBy('newest');
    setSelectedCategoryId(null);
  };

  const uniqueCountries = useMemo(() => {
    const countrySet = new Set(products.map(p => p.countryOfOrigin));
    return Array.from(countrySet).sort();
  }, [products]);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
      <aside>
        <CategorySidebar
          categories={categories}
          loading={loading}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />
      </aside>
      <main className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            {!loading && (
              <p className="text-muted-foreground">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            )}
          </div>
        </div>
        
        <Card>
            <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    placeholder="Search products by title or description..."
                    className="w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loading}
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="price_asc">Price: Low to High</SelectItem>
                            <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger>
                            <SelectValue placeholder="Country of Origin" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Countries</SelectItem>
                            {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-4">
                    <Label>Price Range ({currency})</Label>
                    <Slider
                        min={0}
                        max={maxPrice}
                        step={100}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(priceRange[0])}</span>
                        <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(priceRange[1])}</span>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Stock Availability</Label>
                     <RadioGroup value={stockStatus} onValueChange={setStockStatus} className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in_stock" id="in_stock" />
                            <Label htmlFor="in_stock">In Stock</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="made_to_order" id="made_to_order" />
                            <Label htmlFor="made_to_order">Made to Order</Label>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="ghost" onClick={clearFilters}>Clear All Filters</Button>
            </CardFooter>
        </Card>
        
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
             {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                     <Skeleton className="aspect-video w-full" />
                  </CardHeader>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-full" />
                     <Skeleton className="mt-4 h-8 w-1/2" />
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
            <div className="text-center py-16">
                <h3 className="text-lg font-semibold">No Products Found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your filters to find what you're looking for.</p>
            </div>
        )}
      </main>
    </div>
  );
}
