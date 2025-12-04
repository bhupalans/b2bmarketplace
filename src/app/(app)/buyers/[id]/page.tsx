
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
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Calendar,
  Loader2,
  MapPin,
  ShieldCheck,
  Gem,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getBuyerAndSourcingRequestsClient } from "@/lib/firebase";
import { SourcingRequest, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { SourcingRequestCard } from "@/components/sourcing-request-card";
import { format } from "date-fns";

type BuyerPageData = {
  buyer: User;
  requests: SourcingRequest[];
};

export default function BuyerProfilePage() {
  const params = useParams();
  const { id } = params;
  const { user } = useAuth();
  const [data, setData] = useState<BuyerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (typeof id !== 'string') return;
      try {
        setLoading(true);
        const buyerData = await getBuyerAndSourcingRequestsClient(id);
        if (!buyerData) {
          setError("Buyer not found.");
        } else {
          setData(buyerData);
        }
      } catch (e: any) {
        console.error("Failed to fetch buyer data:", e);
        setError("Failed to load buyer details.");
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

  const { buyer, requests } = data;
  const isOwnProfile = user?.id === buyer.id;
  const isFeaturedBuyer = buyer?.subscriptionPlan?.isFeatured && buyer?.subscriptionExpiryDate && new Date(buyer.subscriptionExpiryDate) > new Date();
  const buyerLocation = [buyer.address?.city, buyer.address?.country].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-1">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 border text-4xl">
              <AvatarImage src={buyer.avatar} alt={buyer.name} />
              <AvatarFallback>{buyer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{buyer.companyName || buyer.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap justify-center">
               {isFeaturedBuyer && (
                    <Badge variant="secondary" className="border-yellow-600/50 text-yellow-700">
                        <Gem className="h-3 w-3 mr-1" />
                        Featured Buyer
                    </Badge>
                )}
                {buyer.verificationStatus === 'verified' && (
                    <Badge variant="secondary" className="border-green-600/50 text-green-700">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified
                    </Badge>
                )}
            </div>
          </CardHeader>
           <CardContent className="text-center">
            {isOwnProfile && (
                 <Button asChild>
                    <Link href="/sourcing/my-requests">Manage My Requests</Link>
                 </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About {buyer.companyName || buyer.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {buyer.companyDescription || "No company description provided."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {buyer.businessType && (
                <div className="flex items-center">
                <Building className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{buyer.businessType}</span>
                </div>
            )}
            {buyerLocation && (
                <div className="flex items-center">
                <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>{buyerLocation}</span>
                </div>
            )}
            {buyer.createdAt && (
                <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>Member since {format(new Date(buyer.createdAt), 'yyyy')}</span>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Active Sourcing Requests ({requests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-2">
                {requests.map((request) => (
                  <SourcingRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-md">
                <p>This buyer has no active sourcing requests.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
