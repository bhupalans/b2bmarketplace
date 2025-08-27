
"use client";

import { useAuth } from "@/contexts/auth-context";
import { getSellerDashboardData } from "@/lib/firestore";
import { Product } from "@/lib/types";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, Package, CheckCircle } from "lucide-react";
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

type DashboardData = {
  totalRevenue: number;
  acceptedOffersCount: number;
  totalProducts: number;
  productsWithOfferCounts: (Product & { offerCount: number })[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "seller") {
      getSellerDashboardData(user.id)
        .then((dashboardData) => {
          setData(dashboardData);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [user]);

  const formattedRevenue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(data?.totalRevenue || 0);
  
  const chartData = data?.productsWithOfferCounts
    .filter(p => p.offerCount > 0)
    .slice(0, 5) // Get top 5
    .map(p => ({
        name: p.title.length > 15 ? `${p.title.substring(0, 15)}...` : p.title,
        offers: p.offerCount
    })).reverse();


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Seller Dashboard</h1>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
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
