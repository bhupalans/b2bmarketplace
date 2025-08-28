
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductAndSeller, getCategoryPath } from "@/lib/firestore";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const productData = await getProductAndSeller(params.id);

  if (!productData) {
    notFound();
  }

  const { product, seller } = productData;
  const categoryPath = await getCategoryPath(product.categoryId);

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
                  // This link is disabled for now, but could lead to a category page
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
                {product.images.map((imgSrc, index) => (
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
                ))}
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

          {seller && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={seller.avatar} alt={seller.name} />
                  <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>
                    <Link href={`/sellers/${seller.id}`} className="hover:underline">
                      {seller.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="secondary" className="mt-1">
                      Seller
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/messages?recipientId=${seller.id}`}>Contact Seller</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
