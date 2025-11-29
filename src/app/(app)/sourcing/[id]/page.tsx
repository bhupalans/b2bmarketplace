
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { SourcingRequest, User } from '@/lib/types';
import { getSourcingRequestClient, getUserClient } from '@/lib/firebase';
import { Loader2, MapPin, Calendar, Package, DollarSign, ShieldCheck, Building } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ContactBuyerDialog } from '@/components/contact-buyer-dialog';
import { useCurrency } from '@/contexts/currency-context';
import { convertPrice } from '@/lib/currency';

export default function SourcingRequestDetailPage() {
  const params = useParams();
  const { id } = params;
  const { currency, rates } = useCurrency();
  const [request, setRequest] = useState<SourcingRequest | null>(null);
  const [buyer, setBuyer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (typeof id !== 'string') {
        setError("Invalid request ID.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const req = await getSourcingRequestClient(id);
        if (req) {
          setRequest(req);
          const buyerData = await getUserClient(req.buyerId);
          setBuyer(buyerData);
        } else {
          setError("Sourcing request not found.");
        }
      } catch (err) {
        setError("Failed to load data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (error) {
    return <div className="text-center py-10 text-destructive">{error}</div>;
  }

  if (!request || !buyer) {
    notFound();
  }

  const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
  const createdAtDate = typeof request.createdAt === 'string' ? new Date(request.createdAt) : request.createdAt.toDate();
  const buyerLocation = [buyer.address?.city, buyer.address?.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{request.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Ship to {request.buyerCountry}
            </div>
            <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Posted {format(createdAtDate, 'PPP')}
            </div>
            <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-destructive" /> Expires in {formatDistanceToNow(expiresAtDate)}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Required Quantity</div>
                        <div>{request.quantity.toLocaleString()} {request.quantityUnit}</div>

                        {request.targetPrice?.baseAmount && (
                            <>
                                <div className="font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> Target Price ({currency})</div>
                                <div>~{new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(convertPrice(request.targetPrice, currency, rates))} / {request.quantityUnit.slice(0,-1)}</div>
                            </>
                        )}
                    </div>
                     <p className="text-base whitespace-pre-wrap leading-relaxed">{request.description}</p>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">About the Buyer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={buyer.avatar} alt={buyer.name} />
                            <AvatarFallback>{buyer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{buyer.name}</p>
                            {buyer.companyName && <p className="text-sm text-muted-foreground">{buyer.companyName}</p>}
                        </div>
                    </div>
                    {buyer.verified && (
                        <Badge variant="secondary" className="border-green-600/50 text-green-700 w-full justify-center">
                            <ShieldCheck className="h-4 w-4 mr-2" /> Verified Buyer
                        </Badge>
                    )}
                     <div className="space-y-2 text-sm">
                        {buyer.businessType && (
                            <div className="flex items-center">
                            <Building className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{buyer.businessType}</span>
                            </div>
                        )}
                        {buyerLocation && (
                            <div className="flex items-center">
                            <MapPin className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>{buyerLocation}</span>
                            </div>
                        )}
                        {buyer.createdAt && (
                            <div className="flex items-center">
                            <Calendar className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>Member since {format(new Date(buyer.createdAt), 'yyyy')}</span>
                            </div>
                        )}
                     </div>
                    <ContactBuyerDialog request={request} buyer={buyer} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
