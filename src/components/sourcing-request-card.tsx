
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SourcingRequest } from '@/lib/types';
import { useCurrency } from '@/contexts/currency-context';
import { convertPrice } from '@/lib/currency';
import { Calendar, DollarSign, MapPin, Package } from 'lucide-react';

export const SourcingRequestCard = ({ request }: { request: SourcingRequest }) => {
    const { currency, rates } = useCurrency();
    const ratesLoaded = Object.keys(rates).length > 1;
    const expiresAtDate = typeof request.expiresAt === 'string' ? new Date(request.expiresAt) : request.expiresAt.toDate();
    const createdAtDate = typeof request.createdAt === 'string' ? new Date(request.createdAt) : request.createdAt.toDate();

    const formattedPrice = useMemo(() => {
        if (!request.targetPrice?.baseAmount || !ratesLoaded) {
            return null; // Return null if data isn't ready
        }
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(convertPrice(request.targetPrice, currency, rates));
    }, [request.targetPrice, currency, rates, ratesLoaded]);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="text-base line-clamp-2 leading-snug">
                     <Link href={`/sourcing/${request.id}`} className="hover:underline">
                        {request.title}
                     </Link>
                </CardTitle>
                <CardDescription>
                    <div className="flex items-center gap-4 text-xs pt-1">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {request.buyerCountry}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Posted {formatDistanceToNow(createdAtDate, { addSuffix: true })}
                        </div>
                    </div>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm text-muted-foreground line-clamp-3">{request.description}</p>
                 <div className="mt-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">{request.quantity.toLocaleString()} {request.quantityUnit}</span>
                 </div>
                 {formattedPrice ? (
                     <div className="mt-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">Target: ~{formattedPrice} / {request.quantityUnit.slice(0, -1)}</span>
                    </div>
                 ) : request.targetPrice?.baseAmount ? (
                    <div className="mt-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                 ) : null}
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm">
                 <Button asChild>
                    <Link href={`/sourcing/${request.id}`}>View Details</Link>
                 </Button>
                 <span className="text-muted-foreground">
                    Expires in {formatDistanceToNow(expiresAtDate)}
                 </span>
            </CardFooter>
        </Card>
    );
};

export const SourcingRequestCardSkeleton = () => (
    <Card className="flex flex-col">
        <CardHeader>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="flex-grow">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
            <Skeleton className="h-6 w-1/3 mt-4" />
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-4 w-20" />
        </CardFooter>
    </Card>
);
