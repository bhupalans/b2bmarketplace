"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { SourcingRequest, Category, SavedSearch } from '@/lib/types';
import {
  getSourcingRequestsClient,
  getActiveCategoriesClient,
  getSavedSearchesClient,
  createSavedSearchClient,
  deleteSavedSearchClient,
  toggleSavedSearchClient,
} from '@/lib/firebase';
import { Loader2, Handshake, Search, BellPlus, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [quantityRange, setQuantityRange] = useState<[number, number]>([0, 1000000]);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('expires_asc');

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSavedSearchId, setSelectedSavedSearchId] = useState<string>('none');
  const [savedSearchName, setSavedSearchName] = useState('');
  const [saveEmailAlerts, setSaveEmailAlerts] = useState(true);
  const [savingSearch, setSavingSearch] = useState(false);
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);

  const maxQuantity = useMemo(() => {
    if (requests.length === 0) return 1000000;
    return Math.max(...requests.map(r => r.quantity), 1000000);
  }, [requests]);

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

  useEffect(() => {
    if (initializedFromQuery) return;

    const querySearch = searchParams.get('search');
    const queryCategoryId = searchParams.get('categoryId');
    const queryCountry = searchParams.get('country');
    const querySortBy = searchParams.get('sortBy');
    const queryMin = Number(searchParams.get('qMin') || 0);
    const queryMax = Number(searchParams.get('qMax') || maxQuantity);
    const querySavedId = searchParams.get('savedSearchId');

    if (querySearch) setSearchTerm(querySearch);
    if (queryCategoryId) setSelectedCategoryId(queryCategoryId);
    if (queryCountry) setSelectedCountry(queryCountry);
    if (querySortBy && ['expires_asc', 'created_desc', 'quantity_desc'].includes(querySortBy)) {
      setSortBy(querySortBy);
    }

    const safeMin = Number.isFinite(queryMin) ? Math.max(0, queryMin) : 0;
    const safeMaxRaw = Number.isFinite(queryMax) ? queryMax : maxQuantity;
    const safeMax = Math.max(safeMin, Math.min(safeMaxRaw, maxQuantity));
    setQuantityRange([safeMin, safeMax]);

    if (querySavedId) setSelectedSavedSearchId(querySavedId);
    setInitializedFromQuery(true);
  }, [initializedFromQuery, searchParams, maxQuantity]);

  useEffect(() => {
    setQuantityRange((prev) => {
      const nextMin = Math.min(prev[0], maxQuantity);
      const nextMax = Math.max(nextMin, Math.min(prev[1], maxQuantity));
      return [nextMin, nextMax];
    });
  }, [maxQuantity]);

  useEffect(() => {
    async function loadSavedSearches() {
      if (!user?.uid) {
        setSavedSearches([]);
        setSelectedSavedSearchId('none');
        return;
      }
      try {
        const searches = await getSavedSearchesClient(user.uid);
        setSavedSearches(searches);
      } catch (err) {
        console.error('Failed to load saved searches:', err);
      }
    }

    loadSavedSearches();
  }, [user?.uid]);

  const filteredRequests = useMemo(() => {
    if (loading) return [];

    let filtered = [...requests];

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
        filtered.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
        break;
      case 'expires_asc':
        filtered.sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime());
        break;
      case 'quantity_desc':
        filtered.sort((a, b) => b.quantity - a.quantity);
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
    setSelectedSavedSearchId('none');
  };

  const applySavedSearch = (savedSearch: SavedSearch) => {
    setSelectedSavedSearchId(savedSearch.id);
    setSavedSearchName(savedSearch.name);
    setSearchTerm(savedSearch.searchTerm || '');
    setSelectedCategoryId(savedSearch.categoryId || null);
    setSelectedCountry(savedSearch.country || 'all');
    setQuantityRange([savedSearch.quantityMin, Math.min(savedSearch.quantityMax, maxQuantity)]);
    setSortBy(savedSearch.sortBy);
    setSaveEmailAlerts(savedSearch.emailAlerts);
  };

  const handleSaveCurrentSearch = async () => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Please sign in to save searches.' });
      return;
    }

    if (savedSearches.length >= 25) {
      toast({ variant: 'destructive', title: 'Limit reached', description: 'You can save up to 25 searches.' });
      return;
    }

    setSavingSearch(true);
    try {
      const fallbackName = searchTerm ? `Search: ${searchTerm.slice(0, 30)}` : `Search ${savedSearches.length + 1}`;
      const created = await createSavedSearchClient(user.uid, {
        name: savedSearchName.trim() || fallbackName,
        searchTerm,
        categoryId: selectedCategoryId,
        country: selectedCountry,
        quantityMin: quantityRange[0],
        quantityMax: quantityRange[1],
        sortBy: sortBy as SavedSearch['sortBy'],
        emailAlerts: saveEmailAlerts,
        enabled: true,
      });
      setSavedSearches((prev) => [created, ...prev]);
      setSelectedSavedSearchId(created.id);
      setSavedSearchName(created.name);
      toast({ title: 'Saved search created', description: 'You will now get matches based on these filters.' });
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Failed to save search', description: err?.message || 'Please try again.' });
    } finally {
      setSavingSearch(false);
    }
  };

  const handleDeleteSavedSearch = async () => {
    if (!user?.uid || selectedSavedSearchId === 'none') return;
    try {
      await deleteSavedSearchClient(user.uid, selectedSavedSearchId);
      setSavedSearches((prev) => prev.filter((search) => search.id !== selectedSavedSearchId));
      setSelectedSavedSearchId('none');
      setSavedSearchName('');
      toast({ title: 'Saved search deleted' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err?.message || 'Could not delete search.' });
    }
  };

  const handleToggleSavedSearch = async () => {
    if (!user?.uid || selectedSavedSearchId === 'none') return;
    const selected = savedSearches.find((search) => search.id === selectedSavedSearchId);
    if (!selected) return;

    const nextEnabled = !selected.enabled;
    try {
      await toggleSavedSearchClient(user.uid, selected.id, nextEnabled);
      setSavedSearches((prev) => prev.map((search) => search.id === selected.id ? { ...search, enabled: nextEnabled } : search));
      toast({ title: nextEnabled ? 'Alerts enabled' : 'Alerts paused' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: err?.message || 'Could not update alert state.' });
    }
  };

  const selectedSavedSearch = savedSearches.find((search) => search.id === selectedSavedSearchId);

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

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Search Alerts</CardTitle>
              <CardDescription>Save your current filters and receive notifications when a new request matches.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Saved searches</Label>
                <Select
                  value={selectedSavedSearchId}
                  onValueChange={(value) => {
                    setSelectedSavedSearchId(value);
                    if (value === 'none') return;
                    const selected = savedSearches.find((search) => search.id === value);
                    if (selected) applySavedSearch(selected);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved search" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None selected</SelectItem>
                    {savedSearches.map((search) => (
                      <SelectItem key={search.id} value={search.id}>
                        {search.name}{search.enabled ? '' : ' (paused)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>New saved search name</Label>
                <Input
                  value={savedSearchName}
                  onChange={(event) => setSavedSearchName(event.target.value)}
                  placeholder="e.g. Electronics buyers in UAE"
                />
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button onClick={handleSaveCurrentSearch} disabled={savingSearch}>
                  {savingSearch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellPlus className="mr-2 h-4 w-4" />}
                  Save current filters
                </Button>
                <Button variant="outline" onClick={() => setSaveEmailAlerts((prev) => !prev)}>
                  Email alerts: {saveEmailAlerts ? 'On' : 'Off'}
                </Button>
                <Button variant="outline" onClick={handleToggleSavedSearch} disabled={!selectedSavedSearch}>
                  {selectedSavedSearch?.enabled ? 'Pause selected alert' : 'Enable selected alert'}
                </Button>
                <Button variant="destructive" onClick={handleDeleteSavedSearch} disabled={!selectedSavedSearch}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete selected
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            {Array.from({ length: 6 }).map((_, i) => <SourcingRequestCardSkeleton key={i} />)}
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
