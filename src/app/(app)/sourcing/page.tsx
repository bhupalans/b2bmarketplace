
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { SourcingRequest, Category } from '@/lib/types';
import { getSourcingRequestsClient, getActiveCategoriesClient } from '@/lib/firebase';
import { Loader2, Handshake, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySidebar } from '@/components/category-sidebar';
import { SourcingRequestCard, SourcingRequestCardSkeleton } from '@/components/sourcing-request-card';

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


export default function SourcingRequestsPage() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantityRange, setQuantityRange] = useState<[number, number]>([0, 1000000]);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('expires_asc');
  
  const maxQuantity = useMemo(() => {
    if (requests.length === 0) return 1000000;
    return Math.max(...requests.map(r => r.quantity), 1000000);
  }, [requests]);

  useEffect(() => {
    setQuantityRange([0, maxQuantity]);
  }, [maxQuantity]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [fetchedRequests, fetchedCategories] = await Promise.all([
          getSourcingRequestsClient(),
          getActiveCategoriesClient(),
        ]);
        setRequests(fetchedRequests);
        setCategories(fetchedCategories);
      } catch (err: any) {
        setError("Failed to load sourcing requests. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredRequests = useMemo(() => {
    if (loading) return [];
    
    let filtered = requests;

    if (selectedCategoryId) {
      const categoryIdsToFilter = getDescendantCategoryIds(selectedCategoryId, categories);
      filtered = filtered.filter(req => categoryIdsToFilter.includes(req.categoryId));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(req => req.buyerCountry === selectedCountry);
    }
    
    filtered = filtered.filter(req => req.quantity >= quantityRange[0] && req.quantity <= quantityRange[1]);

    switch (sortBy) {
        case 'created_desc':
            filtered.sort((a,b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
            break;
        case 'expires_asc':
            filtered.sort((a,b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime());
            break;
        case 'quantity_desc':
            filtered.sort((a,b) => b.quantity - a.quantity);
            break;
    }

    return filtered;
  }, [requests, selectedCategoryId, categories, searchTerm, selectedCountry, quantityRange, sortBy, loading]);

  const uniqueCountries = useMemo(() => {
    const countrySet = new Set(requests.map(r => r.buyerCountry));
    return Array.from(countrySet).sort();
  }, [requests]);

  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSearchTerm('');
    setQuantityRange([0, maxQuantity]);
    setSelectedCountry('all');
    setSortBy('expires_asc');
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
      <aside>
        <CategorySidebar
          categories={categories}
          loading={loading}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </aside>
      <main className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Browse Sourcing Requests</h1>
            <p className="text-muted-foreground">Find opportunities by browsing active requests from buyers.</p>
          </div>
        </div>
        
        <Card>
            <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by keyword..."
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
                            <SelectItem value="expires_asc">Expires Soon</SelectItem>
                            <SelectItem value="created_desc">Newest</SelectItem>
                            <SelectItem value="quantity_desc">Quantity: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger>
                            <SelectValue placeholder="Buyer's Country" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Countries</SelectItem>
                            {uniqueCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <Label>Quantity</Label>
                    <Slider
                        min={0}
                        max={maxQuantity}
                        step={Math.max(1, Math.round(maxQuantity / 100))}
                        value={quantityRange}
                        onValueChange={(value) => setQuantityRange(value as [number, number])}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{quantityRange[0].toLocaleString()}</span>
                        <span>{quantityRange[1].toLocaleString()}{quantityRange[1] === maxQuantity ? '+' : ''}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="ghost" onClick={clearFilters}>Clear All Filters</Button>
            </CardFooter>
        </Card>

        {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({length: 6}).map((_, i) => <SourcingRequestCardSkeleton key={i} />)}
            </div>
        ) : error ? (
            <Card><CardContent className="p-6 text-destructive">{error}</CardContent></Card>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed p-12 text-center">
            <Handshake className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No requests found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRequests.map(req => <SourcingRequestCard key={req.id} request={req} />)}
          </div>
        )}
      </main>
    </div>
  );
}
