
"use client";

import React, { useState, useMemo, useRef, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, Product, SourcingRequest } from "@/lib/types";
import { ArrowRight, Search, Package, ShieldCheck, Globe, Handshake } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import homePageImages from "@/lib/placeholder-images.json";
import { formatDistanceToNow } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";
import { convertPrice } from "@/lib/currency";

function SourcingRequestCard({ request }: { request: SourcingRequest }) {
    const { currency, rates } = useCurrency();
    const ratesLoaded = Object.keys(rates).length > 1;
    const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
    
    const formattedPrice = useMemo(() => {
        if (!request.targetPrice?.baseAmount || !ratesLoaded) {
            return null; // Return null if data isn't ready
        }
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(convertPrice(request.targetPrice, currency, rates));
    }, [request.targetPrice, currency, rates, ratesLoaded]);


    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="text-base line-clamp-2 leading-snug">
                     <Link href={`/sourcing/${request.id}`} className="hover:underline">
                        {request.title}
                     </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow text-sm space-y-1">
                <p>Quantity: <span className="font-semibold">{request.quantity.toLocaleString()} {request.quantityUnit}</span></p>
                <p>Country: <span className="font-semibold">{request.buyerCountry}</span></p>
                {formattedPrice ? (
                    <p>Target Price: <span className="font-semibold">~{formattedPrice} / {request.quantityUnit.slice(0, -1)}</span></p>
                ) : (
                    <div className="flex items-center gap-2">
                        <p>Target Price:</p>
                        <Skeleton className="h-5 w-20" />
                    </div>
                )}
            </CardContent>
            <CardContent className="text-xs text-muted-foreground">
                Expires in {formatDistanceToNow(expiresAtDate)}
            </CardContent>
        </Card>
    )
}

const CategoryCard = ({ category }: { category: Category }) => {
    return (
        <Link href={`/products?category=${category.id}`} key={category.id} className="group block">
            <Card className="overflow-hidden transition-all group-hover:shadow-lg">
                <div className="relative aspect-video">
                    <Image 
                        src={category.imageUrl || "https://placehold.co/400x300"} 
                        alt={category.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                 <div className="p-4">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                </div>
            </Card>
        </Link>
    )
};


// Client Component to handle state and interactions
export function HomePageClient({ initialBranding, initialCategories, initialProducts, initialRequests }: {
    initialBranding: { headline: string, subhead: string },
    initialCategories: Category[],
    initialProducts: Product[],
    initialRequests: SourcingRequest[],
}) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [categories] = useState<Category[]>(initialCategories);
    const [products] = useState<Product[]>(initialProducts);
    const [requests] = useState<SourcingRequest[]>(initialRequests);
    const [loading] = useState(false); // Data is pre-fetched, so initial load is false

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            router.push(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
        }
    };


    return (
        <div className="space-y-10 md:space-y-14">
          {/* Hero Section */}
          <section className="relative -mx-4 sm:-mx-6 flex h-[60vh] max-h-[600px] min-h-[400px] items-center justify-center text-center">
            
            {homePageImages.hero.map((image, index) => (
                <div
                    key={index}
                    className="absolute inset-0 h-full w-full bg-cover bg-center animate-fade-in-out"
                    style={{ 
                        backgroundImage: `url(${image.src})`,
                        animationDelay: `${index * 5}s`,
                        animationDuration: '20s'
                    }}
                    data-ai-hint={image.hint}
                />
            ))}

            <div className="absolute inset-0 z-10 bg-black/50" />
            <div className="relative z-20 mx-auto max-w-2xl text-primary-foreground px-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                {initialBranding.headline}
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/80">
                {initialBranding.subhead}
              </p>
              <form onSubmit={handleSearch} className="relative mx-auto mt-8 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search for products..." 
                    className="w-full rounded-full bg-background/90 py-6 pl-10 text-foreground" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>
          </section>

          
            {/* Why Choose VBuySell */}
<section className="bg-muted/30 py-12">
  <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
    
    <h2 className="text-3xl font-bold">Why Choose VBuySell?</h2>
    <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
      Built for transparent, competitive global B2B sourcing.
    </p>

    <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-4">
      
      <div className="space-y-3">
        <ShieldCheck className="h-14 w-14 text-primary mx-auto" />
        <h3 className="text-lg font-semibold">Verified Suppliers</h3>
        <p className="text-sm text-muted-foreground">
          Reduce sourcing risk by connecting with vetted suppliers.
        </p>
      </div>

      <div className="space-y-3">
        <Handshake className="h-14 w-14 text-primary mx-auto" />
        <h3 className="text-lg font-semibold">Competitive Offers</h3>
        <p className="text-sm text-muted-foreground">
          Multiple suppliers compete to win your order.
        </p>
      </div>

      <div className="space-y-3">
        <Package className="h-14 w-14 text-primary mx-auto" />
        <h3 className="text-lg font-semibold">No Middlemen</h3>
        <p className="text-sm text-muted-foreground">
          Negotiate directly without brokerage markups.
        </p>
      </div>

      <div className="space-y-3">
        <Globe className="h-14 w-14 text-primary mx-auto" />
        <h3 className="text-lg font-semibold">Global Reach</h3>
        <p className="text-sm text-muted-foreground">
          Access international buyers and sellers.
        </p>
      </div>

    </div>
  </div>
</section>


{/* How It Works */}
<section className="mx-auto max-w-6xl px-4 sm:px-6 text-center pt-6 pb-12">
  
  <h2 className="text-3xl font-bold">How It Works</h2>
  <p className="mt-3 text-muted-foreground">
    Simple, transparent sourcing in three clear steps.
  </p>

  <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">

    {/* Step 1 */}
    <div className="flex flex-col items-center">
      <div className="relative">
        <Image src="/illustrations/post.svg" alt="Post requirement" width={140} height={140}/>
        <span className="absolute -top-2 -right-3 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
          1
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold">Post Requirement</h3>
      <p className="mt-2 text-muted-foreground">
        Describe your sourcing needs in detail.
      </p>
    </div>

    {/* Step 2 */}
    <div className="flex flex-col items-center">
      <div className="relative">
        <Image src="/illustrations/offer.svg" alt="Post requirement" width={140} height={140}/>
        <span className="absolute -top-2 -right-3 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
          2
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold">Receive Offers</h3>
      <p className="mt-2 text-muted-foreground">
        Get competitive quotes directly from verified suppliers.
      </p>
    </div>

    {/* Step 3 */}
    <div className="flex flex-col items-center">
      <div className="relative">
        <Image src="/illustrations/deal.svg" alt="Post requirement" width={140} height={140}/>
        <span className="absolute -top-2 -right-3 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
          3
        </span>
      </div>
      <h3 className="mt-4 text-xl font-semibold">Choose & Deal</h3>
      <p className="mt-2 text-muted-foreground">
        Compare offers and close your deal confidently.
      </p>
    </div>

  </div>
</section>


          {/* Categories Section */}
          <section className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Explore Our Categories</h2>
              <Button variant="link" asChild>
                <Link href="/categories">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
              {loading ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-32 w-full"/>) :
               categories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
            </div>
          </section>


          {/* Featured Products Section */}
          <section className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <Button variant="link" asChild>
                <Link href="/products">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? Array.from({length: 3}).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="p-0"><Skeleton className="aspect-video w-full" /></CardHeader>
                      <CardContent className="p-6"><Skeleton className="h-6 w-3/4" /><Skeleton className="mt-2 h-4 w-full" /></CardContent>
                    </Card>
                )) : products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </section>

           {/* Latest Sourcing Requests Section */}
          <section className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Latest Sourcing Requests</h2>
              <Button variant="link" asChild>
                <Link href="/sourcing">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? Array.from({length: 3}).map((_, i) => (
                    <Card key={i}>
                      <CardHeader><Skeleton className="h-6 w-full" /></CardHeader>
                      <CardContent><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-2 h-4 w-1/3" /></CardContent>
                    </Card>
                )) : requests.map(request => (
                    <SourcingRequestCard key={request.id} request={request} />
                ))}
            </div>
          </section>
        </div>
      );
}

    