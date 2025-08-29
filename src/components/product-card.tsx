
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
import { ContactSellerDialog } from "./contact-seller-dialog";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency, rates } = useCurrency();
  const [seller, setSeller] = useState<User | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!product.sellerId) {
        setLoadingSeller(false);
        return;
      }
      try {
        setLoadingSeller(true);
        const userRef = doc(db, 'users', product.sellerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setSeller({ id: userSnap.id, uid: userSnap.id, ...userSnap.data() } as User);
        }
      } catch (error) {
        console.error("Failed to fetch seller for product card:", error);
        setSeller(null);
      } finally {
        setLoadingSeller(false);
      }
    };

    fetchSeller();
  }, [product.sellerId]);


  const getConvertedPrice = () => {
    if (currency === "USD") {
      return product.priceUSD;
    }
    const rate = rates[currency] || 1;
    return product.priceUSD * rate;
  };

  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  }).format(getConvertedPrice());

  return (
    <Card className="flex h-full w-full flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0">
        <Link href={`/products/${product.id}`}>
          <div className="relative aspect-video w-full">
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              data-ai-hint="product image"
            />
          </div>
        </Link>
        <div className="p-6 pb-2">
          <CardTitle>
            <Link href={`/products/${product.id}`} className="hover:underline">
              {product.title}
            </Link>
          </CardTitle>
          <CardDescription className="mt-2 line-clamp-2">
            {product.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-6 pt-0">
        <p className="text-2xl font-bold text-primary">{formattedPrice}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        {loadingSeller ? (
            <Skeleton className="h-10 w-full" />
        ) : seller ? (
            <ContactSellerDialog product={product} seller={seller} />
        ) : (
            <div className="text-sm text-muted-foreground">Seller not available</div>
        )}
      </CardFooter>
    </Card>
  );
}
