
"use client";

import { useAuth } from "@/contexts/auth-context";
import { getBuyerDashboardData } from "@/app/buyer-actions";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DollarSign, CheckCircle, Gem, FileText, Activity } from "lucide-react";
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
  totalRequests: number;
  activeRequests: number;
  totalSpend: number; // This is now always in USD from the server
  acceptedOffersCount: number;
  requestStatusData: { status: string; count: number }[];
};

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const { currency, rates } = useCurrency();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const hasActiveSubscription = user?.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) > new Date();

  useEffect(() => {
    if (user?.role === "buyer" && hasActiveSubscription) {
      getBuyerDashboardData(user.id)
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
                    The buyer dashboard with analytics is a premium feature.
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
  const convertedSpend = convertPrice({ baseAmount: data?.totalSpend || 0, baseCurrency: 'USD' }, currency, rates);
  const formattedSpend = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(convertedSpend);
*/

const baseUSD = data?.totalSpend || 0;

const formattedUSD = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(baseUSD);

let formattedLocal = "";
let showLocalCard = false;

if (rates && currency && currency !== "USD") {
  const convertedSpend = convertPrice(
    { baseAmount: baseUSD, baseCurrency: "USD" },
    currency,
    rates
  );

  formattedLocal = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedSpend);

  showLocalCard = true;
}


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : !data ? (
         <Card><CardContent className="p-6">Could not load dashboard data.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Spend
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formattedUSD}</div>
              <p className="text-xs text-muted-foreground">
                From all accepted offers
              </p>
            </CardContent>
	
	<Link
  		href={`/sourcing/dashboard/fx-breakdown?buyerId=${user?.id}`}className="text-xs text-blue-600 hover:underline">
  		View FX Breakdown →
	</Link>


          </Card>


<Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        Spend ({currency} Equivalent)
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
                +{data.acceptedOffersCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Total offers you have accepted
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sourcing Requests
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                All requests you have posted
              </p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Requests
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.activeRequests}</div>
              <p className="text-xs text-muted-foreground">
                Currently visible to sellers
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
            <CardTitle>Sourcing Requests by Status</CardTitle>
            <CardDescription>
                Overview of all your sourcing request statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.requestStatusData && data.requestStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.requestStatusData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
                <div className="flex h-60 items-center justify-center text-muted-foreground">
                    <p>No request data to display yet.</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
