
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { getProductAndSellerClient } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Product, User, Category } from "@/lib/types";
import { getCategoryPathClient } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/currency-context";
import { CheckCircle, Loader2 } from "lucide-react";
import { RequestQuoteDialog } from "@/components/request-quote-dialog";
import { Button } from "@/components/ui/button";

type ProductData = {
  product: Product;
  seller: User | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const { id } = params;
  const { currency, rates } = useCurrency();

  const [productData, setProductData] = useState<ProductData | null>(null);
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      if (typeof id !== 'string') return;
      
      try {
        setLoading(true);
        const data = await getProductAndSellerClient(id);
        if (!data) {
          setError("Product not found.");
          return;
        }
        setProductData(data);
        
        if (data.product.categoryId) {
            const path = await getCategoryPathClient(data.product.categoryId);
            setCategoryPath(path);
        }
      } catch (e: any) {
        console.error("Failed to fetch product data:", e);
        setError("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const getConvertedPrice = (priceUSD: number) => {
    if (currency === "USD" || !rates[currency]) {
      return priceUSD;
    }
    return priceUSD * rates[currency];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
     return <div className="text-center py-10">{error}</div>;
  }

  if (!productData) {
    notFound();
  }

  const { product, seller } = productData;

  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
  }).format(getConvertedPrice(product.priceUSD));


  return (
    <div className="mx-auto max-w-4xl space-y-8">
       <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {categoryPath.map((cat, index) => (
            <React.Fragment key={cat.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === categoryPath.length - 1 ? (
                  <BreadcrumbPage>{cat.name}</BreadcrumbPage>
                ) : (
                  <span className="cursor-not-allowed">{cat.name}</span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
           <Card className="overflow-hidden">
             <Carousel className="w-full">
              <CarouselContent>
                {Array.isArray(product.images) && product.images.length > 0 ? (
                  product.images.map((imgSrc, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-square w-full">
                        <Image
                          src={imgSrc}
                          alt={`${product.title} - view ${index + 1}`}
                          fill
                          className="object-cover"
                          data-ai-hint="product image"
                        />
                      </div>
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem>
                    <div className="relative aspect-square w-full">
                      <Image
                        src="https://placehold.co/600x600"
                        alt="Product image placeholder"
                        fill
                        className="object-cover"
                        data-ai-hint="placeholder image"
                      />
                    </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="absolute left-4" />
              <CarouselNext className="absolute right-4" />
            </Carousel>
           </Card>
          {product.specifications && product.specifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {product.specifications.map((spec) => (
                      <TableRow key={spec.name}>
                        <TableCell className="font-medium">{spec.name}</TableCell>
                        <TableCell>{spec.value === 'true' ? 'Yes' : spec.value === 'false' ? 'No' : spec.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{product.title}</CardTitle>
               <CardDescription className="pt-2">
                 <p className="text-3xl font-bold text-primary">
                  {formattedPrice}
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </CardContent>
          </Card>

          {seller && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={seller.avatar} alt={seller.name} />
                  <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">Sold By</CardTitle>
                  <CardDescription>
                    <Link href={`/sellers/${seller.id}`} className="text-lg font-semibold text-foreground hover:underline">
                      {seller.name}
                    </Link>
                     {seller.verified && (
                        <Badge variant="secondary" className="ml-2 border-green-600/50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                        </Badge>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                 <RequestQuoteDialog product={product} seller={seller} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
