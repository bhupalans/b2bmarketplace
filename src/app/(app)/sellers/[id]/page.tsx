
import { notFound } from "next/navigation";
import { mockUsers, mockProducts } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Calendar,
  CheckBadge,
  MapPin,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function getSellerData(id: string) {
  const seller = mockUsers[id];
  if (!seller || seller.role !== "seller") {
    return null;
  }
  const products = mockProducts.filter((p) => p.sellerId === id);
  return { seller, products };
}

export default async function SellerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSellerData(params.id);

  if (!data) {
    notFound();
  }

  const { seller, products } = data;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-1">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 border text-4xl">
              <AvatarImage src={seller.avatar} alt={seller.name} />
              <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{seller.name}</CardTitle>
            <CardDescription>
              A trusted B2B Marketplace seller.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/messages">Contact Seller</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About {seller.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {seller.companyDescription}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center">
              <Building className="mr-3 h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{seller.businessType}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
              <span>{seller.location}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
              <span>Member since {seller.memberSince}</span>
            </div>
          </CardContent>
        </Card>

        {seller.certifications && seller.certifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {seller.certifications.map((cert) => (
                <Badge
                  key={cert}
                  variant="secondary"
                  className="flex items-center gap-1.5"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  {cert}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-8 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Products from {seller.name} ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>This seller has not listed any products yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
