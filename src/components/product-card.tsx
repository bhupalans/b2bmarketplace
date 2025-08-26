
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/contexts/currency-context";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency, rates } = useCurrency();

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
    <Link href={`/products/${product.id}`} className="flex">
      <Card className="flex h-full w-full flex-col overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-cover"
              data-ai-hint="product image"
            />
          </div>
          <div className="p-6 pb-2">
            <CardTitle>{product.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {product.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-6 pt-0">
          <p className="text-2xl font-bold text-primary">{formattedPrice}</p>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button asChild className="w-full">
            <Link href="/messages">Contact Seller</Link>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
