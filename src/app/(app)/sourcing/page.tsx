
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { SourcingRequest, Category } from '@/lib/types';
import { getSourcingRequestsClient, getActiveCategoriesClient } from '@/lib/firebase';
import { Loader2, Handshake, MapPin, Calendar, Package } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CategorySidebar } from '@/components/category-sidebar';
import { Skeleton } from '@/components/ui/skeleton';

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
    const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
    const createdAtDate = typeof request.createdAt === 'string' ? new Date(request.createdAt) : request.createdAt.toDate();

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
    if (!selectedCategoryId) {
      return requests;
    }
    const categoryIdsToFilter = getDescendantCategoryIds(selectedCategoryId, categories);
    return requests.filter(req => categoryIdsToFilter.includes(req.categoryId));
  }, [requests, selectedCategoryId, categories]);

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
              There are no active sourcing requests in this category.
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
