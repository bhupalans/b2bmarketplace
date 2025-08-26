
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { mockProducts, mockUsers, mockCategories } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Category } from "@/lib/types";

// This is a server component, so we can fetch data directly.
// In a real app, you'd fetch this from a database.
async function getProduct(id: string) {
  const product = mockProducts.find((p) => p.id === id);
  if (!product) {
    return null;
  }
  const seller = mockUsers[product.sellerId];
  
  const categoryPath: Category[] = [];
  let currentCategory = mockCategories.find(c => c.id === product.categoryId);
  while (currentCategory) {
    categoryPath.unshift(currentCategory);
    currentCategory = mockCategories.find(c => c.id === currentCategory!.parentId);
  }

  return { product, seller, categoryPath };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getProduct(params.id);

  if (!data) {
    notFound();
  }

  const { product, seller, categoryPath } = data;

  // We can't use the useCurrency hook here because this is a Server Component.
  // We'll just display the price in USD for now.
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.priceUSD);

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
                  <BreadcrumbLink asChild>
                    {/* In a real app, this would link to a category page */}
                    <Link href="#">{cat.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <Card className="overflow-hidden">
            <div className="relative aspect-square w-full">
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-cover"
                data-ai-hint="product image"
              />
            </div>
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
                        <TableCell>{spec.value}</TableCell>
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
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formattedPrice}
              </p>
              <p className="mt-4 text-muted-foreground">
                {product.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={seller.avatar} alt={seller.name} />
                <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{seller.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="mt-1">
                    Seller
                  </Badge>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/messages">Contact Seller</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
