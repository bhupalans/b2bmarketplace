import ProductImageCarousel from '@/components/product/ProductImageCarousel';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getUser, getCategoryPath } from '@/lib/database';
import {
  getQuestionsForProductClient,
  getProductsClient,
} from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Product, User } from '@/lib/types';
import { CheckCircle, Globe, Package, Clock, Tag, Gem } from 'lucide-react';
import { RequestQuoteDialog } from '@/components/request-quote-dialog';
import { Separator } from '@/components/ui/separator';
import { ProductCard } from '@/components/product-card';
import { ProductDetailsClient, QuestionArea } from './product-details-client';
import { Metadata, ResolvingMetadata } from 'next';

type Props = {
  params: { id: string };
};

// This function generates dynamic metadata for each product page.
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const seller = await getUser(product.sellerId);

  const getAvailability = () => {
    switch (product.stockAvailability) {
      case 'in_stock':
        return 'https://schema.org/InStock';
      case 'out_of_stock':
        return 'https://schema.org/OutOfStock';
      case 'made_to_order':
        return 'https://schema.org/InStock'; // Made to order implies it can be supplied
      default:
        return undefined;
    }
  };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images[0],
    sku: product.sku,
    brand: {
        '@type': 'Brand',
        name: seller?.companyName || seller?.name
    },
    offers: {
        '@type': 'Offer',
        price: product.price.baseAmount,
        priceCurrency: product.price.baseCurrency,
        availability: getAvailability(),
        seller: {
            '@type': 'Organization',
            name: seller?.companyName || seller?.name
        }
    }
  };

  // optionally access and extend (rather than replace) parent metadata
  const previousImages = (await parent).openGraph?.images || [];



  return {
    title: `${product.title}`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: product.title,
      description: product.description.substring(0, 160),
      images: [
        {
          url: product.images[0],
          width: 600,
          height: 600,
          alt: product.title,
        },
        ...previousImages,
      ],
    },
    other: {
        'application/ld+json': JSON.stringify(productSchema)
    }
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await getProduct(id);

  if (!product || product.status !== 'approved') {
    notFound();
  }

  const seller = product.sellerId ? await getUser(product.sellerId) : null;
  const categoryPath = await getCategoryPath(product.categoryId);
  const questions = await getQuestionsForProductClient(id);

  // Fetch similar and seller products (still uses client functions for now for simplicity)
  const allProducts = await getProductsClient();
  const similarProducts = allProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 3);
  const sellerProducts = seller
    ? allProducts
        .filter((p) => p.sellerId === seller.id && p.id !== product.id)
        .slice(0, 3)
    : [];
    
  const isFeaturedSeller = seller?.subscriptionPlan?.isFeatured && seller?.subscriptionExpiryDate && new Date(seller.subscriptionExpiryDate) > new Date();

  //const [open, setOpen] = useState(false);
  //const [activeImage, setActiveImage] = useState<string | null>(null);

	
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
                    <Link href={`/products?category=${cat.id}`}>{cat.name}</Link>
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
  <ProductImageCarousel
    images={Array.isArray(product.images) ? product.images : []}
    title={product.title}
  />
</Card>

          
          {product.specifications && product.specifications.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Technical Specifications</h2>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {product.specifications.map((spec) => (
                      <TableRow key={spec.name}>
                        <TableCell className="font-medium">{spec.name}</TableCell>
                        <TableCell>
                          {spec.value.includes(',') ? (
                            <div className="flex flex-wrap gap-1">
                              {spec.value
                                .split(',')
                                .map((v) => v.trim())
                                .map((val) => (
                                  <Badge key={val} variant="secondary">
                                    {val}
                                  </Badge>
                                ))}
                            </div>
                          ) : spec.value === 'true' ? (
                            'Yes'
                          ) : spec.value === 'false' ? (
                            'No'
                          ) : (
                            spec.value
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
            <ProductDetailsClient
              product={product}
              seller={seller}
            />
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Questions &amp; Answers</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <QuestionArea
            initialQuestions={questions}
            product={product}
          />
        </CardContent>
      </Card>

      {sellerProducts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">More Products From This Seller</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sellerProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {similarProducts.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Similar Products in This Category</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
  
    </div>
  );
}
