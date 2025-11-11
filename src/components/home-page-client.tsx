
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Category, Product, SourcingRequest } from "@/lib/types";
import { ArrowRight, Search, Building, Package, ShieldCheck, Globe, Handshake } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import homePageImages from "@/lib/placeholder-images.json";
import { formatDistanceToNow } from "date-fns";
import { useCurrency } from "@/contexts/currency-context";

function SourcingRequestCard({ request }: { request: SourcingRequest }) {
    const { currency, rates } = useCurrency();
    const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
    
    const getConvertedTargetPrice = () => {
        if (!request.targetPriceUSD) return null;
        if (currency === "USD" || !rates[currency]) {
          return request.targetPriceUSD;
        }
        return request.targetPriceUSD * rates[currency];
    };
    
    const convertedPrice = getConvertedTargetPrice();
    const formattedPrice = convertedPrice ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency,
        notation: "compact"
    }).format(convertedPrice) : null;


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
                {formattedPrice && <p>Target Price: <span className="font-semibold">~{formattedPrice} / {request.quantityUnit.slice(0, -1)}</span></p>}
            </CardContent>
            <CardContent className="text-xs text-muted-foreground">
                Expires in {formatDistanceToNow(expiresAtDate)}
            </CardContent>
        </Card>
    )
}

const iconMap: { [key: string]: React.ElementType } = {
    "Industrial Supplies": Building,
    "Raw Materials": Package,
    "Electronics": Package,
    "Beauty & Personal Care": Package,
    "Agriculture": Package,
};

// Client Component to handle state and interactions
export function HomePageClient({ initialBranding, initialCategories, initialProducts, initialRequests }: {
    initialBranding: { headline: string, subhead: string },
    initialCategories: Category[],
    initialProducts: Product[],
    initialRequests: SourcingRequest[],
}) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [requests, setRequests] = useState<SourcingRequest[]>(initialRequests);
    const [loading, setLoading] = useState(false); // Data is pre-fetched, so initial load is false

    return (
        <div className="space-y-12 md:space-y-20">
          {/* Hero Section */}
          <section className="relative -mx-4 sm:-mx-6 flex h-[60vh] max-h-[600px] min-h-[400px] items-center justify-center text-center">
            <div className="absolute inset-0 bg-black/50 z-10" />
            <Image
              src={homePageImages.hero.src}
              alt={homePageImages.hero.alt}
              fill
              className="object-cover"
              priority
              data-ai-hint={homePageImages.hero.hint}
            />
            <div className="relative z-20 mx-auto max-w-2xl text-primary-foreground px-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                {initialBranding.headline}
              </h1>
              <p className="mt-4 text-lg text-primary-foreground/80">
                {initialBranding.subhead}
              </p>
              <div className="relative mx-auto mt-8 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search for products..." className="w-full rounded-full bg-background/90 py-6 pl-10 text-foreground" />
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
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {loading ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-32 w-full"/>) :
               categories.map(cat => {
                   const Icon = iconMap[cat.name] || Package;
                   return (
                    <Link href={`/products?category=${cat.id}`} key={cat.id}>
                        <Card className="group flex h-32 flex-col items-center justify-center p-4 text-center transition-all hover:bg-primary hover:text-primary-foreground">
                            <Icon className="h-8 w-8 text-primary transition-all group-hover:text-primary-foreground" />
                            <p className="mt-2 text-sm font-semibold">{cat.name}</p>
                        </Card>
                    </Link>
                   )
               })}
            </div>
          </section>

          {/* Why Choose Us Section */}
          <section className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 text-center">
                  <div className="flex flex-col items-center">
                      <ShieldCheck className="h-12 w-12 text-primary"/>
                      <h3 className="mt-4 text-xl font-semibold">Verified Suppliers</h3>
                      <p className="mt-2 text-muted-foreground">Connect with trusted and vetted suppliers from around the world to ensure quality and reliability.</p>
                  </div>
                   <div className="flex flex-col items-center">
                      <Handshake className="h-12 w-12 text-primary"/>
                      <h3 className="mt-4 text-xl font-semibold">Direct Sourcing</h3>
                      <p className="mt-2 text-muted-foreground">Post your specific needs and receive competitive quotes directly from interested sellers.</p>
                  </div>
                   <div className="flex flex-col items-center">
                      <Globe className="h-12 w-12 text-primary"/>
                      <h3 className="mt-4 text-xl font-semibold">Global Reach</h3>
                      <p className="mt-2 text-muted-foreground">Expand your business horizons by accessing a vast network of international buyers and sellers.</p>
                  </div>
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
