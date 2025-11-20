
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { SourcingRequest, Category } from '@/lib/types';
import { getSourcingRequestsClient, getActiveCategoriesClient } from '@/lib/firebase';
import { Loader2, Handshake, MapPin, Calendar, Package, Search, DollarSign } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import Link from 'next/link';
import { CategorySidebar } from '@/components/category-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/currency-context';

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

const RequestCard = ({ request }: { request: SourcingRequest }) => {
    const { currency, rates } = useCurrency();
    const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
    const createdAtDate = typeof request.createdAt === 'string' ? new Date(request.createdAt) : request.createdAt.toDate();

    const getConvertedTargetPrice = () => {
        if (!request.targetPrice?.baseAmount) return null;
        if (!rates[request.targetPrice.baseCurrency] || !rates[currency]) {
          return request.targetPrice.baseAmount;
        }
        const priceInUSD = request.targetPrice.baseAmount / rates[request.targetPrice.baseCurrency];
        return priceInUSD * rates[currency];
    };
    
    const convertedPrice = getConvertedTargetPrice();
    const formattedPrice = convertedPrice ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency,
        notation: "compact"
    }).format(convertedPrice) : null;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="line-clamp-2">
                     <Link href={`/sourcing/${request.id}`} className="hover:underline">
                        {request.title}
                     </Link>
                </CardTitle>
                <CardDescription>
                    <div className="flex items-center gap-4 text-xs pt-1">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {request.buyerCountry}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Posted {formatDistanceToNow(createdAtDate, { addSuffix: true })}
                        </div>
                    </div>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm text-muted-foreground line-clamp-3">{request.description}</p>
                 <div className="mt-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">{request.quantity.toLocaleString()} {request.quantityUnit}</span>
                 </div>
                 {formattedPrice && (
                     <div className="mt-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Target: ~{formattedPrice} / {request.quantityUnit.slice(0, -1)}</span>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
                 <Button asChild>
                    <Link href={`/sourcing/${request.id}`}>View Details</Link>
                 </Button>
                 <span className="text-muted-foreground">
                    Expires in {formatDistanceToNow(expiresAtDate)}
                 </span>
            </CardFooter>
        </Card>
    );
};

const RequestCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="flex-grow">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
            <Skeleton className="h-6 w-1/3 mt-4" />
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-4 w-20" />
        </CardFooter>
    </Card>
);

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
                {Array.from({length: 6}).map((_, i) => <RequestCardSkeleton key={i} />)}
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
            {filteredRequests.map(req => <RequestCard key={req.id} request={req} />)}
          </div>
        )}
      </main>
    </div>
  );
}
