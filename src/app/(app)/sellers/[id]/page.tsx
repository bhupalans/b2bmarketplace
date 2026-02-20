
"use client";

import { notFound, useParams } from "next/navigation";
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
  Loader2,
  MapPin,
  Trophy,
  CheckCircle,
  Gem,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSellerAndProductsClient } from "@/lib/firebase";
import { Product, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

type SellerPageData = {
  seller: User;
  products: Product[];
};

export default function SellerProfilePage() {
  const params = useParams();
  const { id } = params;
  const { user } = useAuth();
  const [data, setData] = useState<SellerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (typeof id !== 'string') return;
      try {
        setLoading(true);
        const sellerData = await getSellerAndProductsClient(id);
        if (!sellerData) {
          setError("Seller not found.");
        } else {
          setData(sellerData);
        }
      } catch (e: any) {
        console.error("Failed to fetch seller data:", e);
        setError("Failed to load seller details.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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
  
  if (!data) {
    notFound();
  }

  const { seller, products } = data;
  const isOwnProfile = user?.id === seller.id;
  const isFeaturedSeller = seller?.subscriptionPlan?.isFeatured && seller?.subscriptionExpiryDate && new Date(seller.subscriptionExpiryDate) > new Date();

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
            <div className="flex items-center gap-2 flex-wrap justify-center">
               {isFeaturedSeller && (
                    <Badge variant="secondary" className="border-yellow-600/50 text-yellow-700">
                        <Gem className="h-3 w-3 mr-1" />
                        Featured Seller
                    </Badge>
                )}
                {seller.verificationStatus === 'verified' && (
                    <Badge variant="secondary" className="border-green-600/50 text-green-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Seller
                    </Badge>
                )}
            </div>
          </CardHeader>
          <CardContent className="text-center">
            {isOwnProfile ? (
                 <Button asChild>
                    <Link href="/my-products">Manage My Products</Link>
                 </Button>
            ) : (
                <p className="text-sm text-muted-foreground">
                    To contact this seller, please request a quote on one of their products.
                </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About {seller.companyName || seller.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {seller.companyDescription || "No company description provided."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {seller.businessType && (
                <div className="flex items-center">
                <Building className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{seller.businessType}</span>
                </div>
            )}
            {seller.location && (
                <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>{seller.location}</span>
                </div>
            )}
            {seller.memberSince && (
                <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>Member since {seller.memberSince}</span>
                </div>
            )}
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
