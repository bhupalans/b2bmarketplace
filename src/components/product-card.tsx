
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
import { useProducts } from "@/hooks/use-products";
import { Skeleton } from "./ui/skeleton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { currency, rates } = useCurrency();
  const { users, loading: usersLoading } = useProducts();

  const seller = users.find((u) => u.uid === product.sellerId);

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
        {usersLoading ? (
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
