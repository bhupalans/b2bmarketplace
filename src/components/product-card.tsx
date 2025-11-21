
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/contexts/currency-context";
import { Product, User } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, getUserClient } from "@/lib/firebase";
import { Badge } from "./ui/badge";
import { CheckCircle, FileText, Gem } from "lucide-react";
import { RequestQuoteDialog } from "./request-quote-dialog";
import { convertPrice } from "@/lib/currency";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency, rates } = useCurrency();
  const [seller, setSeller] = useState<User | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const ratesLoaded = Object.keys(rates).length > 1;

  useEffect(() => {
    const fetchSeller = async () => {
      if (!product.sellerId) {
        setLoadingSeller(false);
        return;
      }
      try {
        setLoadingSeller(true);
        const user = await getUserClient(product.sellerId);
        setSeller(user);
      } catch (error) {
        console.error("Failed to fetch seller for product card:", error);
        setSeller(null);
      } finally {
        setLoadingSeller(false);
      }
    };

    fetchSeller();
  }, [product.sellerId]);


  const formattedPrice = useMemo(() => {
    if (!product.price || !ratesLoaded) {
      return null; // Return null if data is not ready
    }
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
    }).format(convertPrice(product.price, currency, rates));
  }, [currency, rates, product.price, ratesLoaded]);
  
  const isFeaturedSeller = seller?.subscriptionPlan?.isFeatured;

  return (
    <Card className="flex h-full w-full flex-col overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/products/${product.id}`} className="block p-0">
        <CardHeader className="p-0">
            <div className="relative aspect-video w-full">
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                className="object-cover"
                data-ai-hint="product image"
              />
            </div>
        </CardHeader>
        <CardContent className="p-6 pb-2">
            <CardTitle className="hover:underline">
              {product.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {product.description}
            </CardDescription>
        </CardContent>
      </Link>
      <CardContent className="flex-grow p-6 pt-2">
        {formattedPrice ? (
          <p className="text-2xl font-bold text-primary">{formattedPrice}</p>
        ) : (
          <Skeleton className="h-8 w-1/2" />
        )}
         {loadingSeller ? (
          <Skeleton className="h-5 w-2/3 mt-2" />
        ) : seller ? (
          <div className="mt-2 text-sm text-muted-foreground">
             <Link href={`/sellers/${seller.id}`} className="hover:underline font-medium text-foreground">
                {seller.name}
              </Link>
            {isFeaturedSeller && (
                 <Badge variant="secondary" className="ml-2 border-yellow-600/50 text-yellow-700">
                    <Gem className="h-3 w-3 mr-1" />
                    Featured
                </Badge>
            )}
            {seller.verified && (
                <Badge variant="secondary" className="ml-2 border-green-600/50 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                </Badge>
            )}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="p-6 pt-0">
        {loadingSeller ? (
            <Skeleton className="h-10 w-full" />
        ) : seller ? (
            <RequestQuoteDialog product={product} seller={seller} />
        ) : (
            <div className="text-sm text-muted-foreground">Seller not available</div>
        )}
      </CardFooter>
    </Card>
  );
}
