
"use client";

import { useAuth } from "@/contexts/auth-context";
import { getSellerDashboardData } from "@/app/seller-actions";
import { Product } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Package, CheckCircle, Gem, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { convertPrice } from "@/lib/currency";

type DashboardData = {
  totalRevenue: number; // This is now always in USD from the server
  acceptedOffersCount: number;
  totalProducts: number;
  productsWithOfferCounts: (Product & { offerCount: number })[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { currency, rates } = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const hasActiveSubscription = user?.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > new Date();


  useEffect(() => {
    if (user?.role === "seller" && hasActiveSubscription) {
      getSellerDashboardData(user.id)
        .then((result) => {
          if (result.success && result.data) {
            setData(result.data);
          } else {
             toast({
              variant: "destructive",
              title: "Error fetching dashboard",
              description: result.error || "An unknown error occurred.",
            });
          }
        })
        .catch((error) => {
            console.error(error);
            toast({
              variant: "destructive",
              title: "Error fetching dashboard",
              description: "Could not load dashboard data.",
            });
        })
        .finally(() => setLoading(false));
    } else if (user) {
        // If the user is not a seller or has no active plan, stop loading.
        setLoading(false);
    }
  }, [user, hasActiveSubscription, toast]);

  if (!hasActiveSubscription) {
    return (
        <div className="flex justify-center items-center h-full">
            <Alert className="max-w-md text-center">
                <Gem className="h-4 w-4" />
                <AlertTitle>Upgrade to View Dashboard</AlertTitle>
                <AlertDescription>
                    The seller dashboard with revenue and product analytics is a premium feature.
                    <Button asChild variant="link">
                        <Link href="/profile/subscription">Upgrade your plan</Link>
                    </Button>
                    to unlock this page.
                </AlertDescription>
            </Alert>
        </div>
    )
  }

/*
  const convertedRevenue = convertPrice({ baseAmount: data?.totalRevenue || 0, baseCurrency: 'USD' }, currency, rates);
  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(convertedRevenue);
*/

const formattedRevenue = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format(data?.totalRevenue || 0);

  
  const chartData = data?.productsWithOfferCounts
    .filter(p => p.offerCount > 0)
    .sort((a,b) => a.offerCount - b.offerCount) // sort ascending for horizontal chart
    .slice(-5) // Get top 5
    .map(p => ({
        name: p.title.length > 15 ? `${p.title.substring(0, 15)}...` : p.title,
        offers: p.offerCount
    }));

    const baseUSD = data?.totalRevenue || 0;
    
    let formattedLocal = "";
    let showLocalCard = false;

    if (rates && currency && currency !== "USD") {
       const convertedRevenue = convertPrice(
       { baseAmount: baseUSD, baseCurrency: "USD" },
       currency,
       rates
    );

	formattedLocal = new Intl.NumberFormat("en-IN", {
  		style: "currency",
  		currency: currency,
  		minimumFractionDigits: 2,
  		maximumFractionDigits: 2,
	}).format(convertedRevenue);


  	showLocalCard = true;
    }


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Seller Dashboard</h1>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !data ? (
         <Card><CardContent className="p-6">Could not load dashboard data.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formattedRevenue}</div>
              <p className="text-xs text-muted-foreground">
                From all accepted offers
              </p>
            </CardContent>

	<div className="mt-2">
  <Link
    href={`/dashboard/fx-breakdown?sellerId=${user?.id}`}
    className="text-xs text-blue-600 hover:underline" >
    View FX Breakdown →
  </Link>
</div>

          </Card>

	
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        Revenue ({currency} Equivalent)
      </CardTitle>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {formattedLocal}
      </div>
      <p className="text-xs text-muted-foreground">
        Based on current exchange rate
      </p>
    </CardContent>
  </Card>





          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accepted Offers
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                +{data?.acceptedOffersCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Total offers accepted by buyers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Total products visible to buyers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96" />
      ) : !data ? (
        <Card><CardContent className="p-6">Could not load chart data.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Offers</CardTitle>
            <CardDescription>
                This chart shows your top 5 products that have received the most offers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false}>
                    <Label value="Number of Offers" offset={-10} position="insideBottom" />
                </XAxis>
                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="offers" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
                <div className="flex h-60 items-center justify-center text-muted-foreground">
                    <p>No offer data to display yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
