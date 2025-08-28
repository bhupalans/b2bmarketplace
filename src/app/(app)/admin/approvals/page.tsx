
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";
import { Product, User } from '@/lib/types';
import { getPendingProducts, getUsers } from '@/lib/database';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { approveProductAction, rejectProductAction } from '@/app/admin-actions';
import { cn } from '@/lib/utils';

export default function AdminApprovalsPage() {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  useEffect(() => {
    async function fetchData() {
        try {
            const [products, usersData] = await Promise.all([
                getPendingProducts(),
                getUsers()
            ]);
            setPendingProducts(products);
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load pending products.' });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleAction = async (action: 'approve' | 'reject', productId: string) => {
    setProcessingId(productId);
    startTransition(async () => {
        if (!firebaseUser) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
             return;
        }
        const idToken = await firebaseUser.getIdToken();
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${idToken}`);

        const result = action === 'approve' 
            ? await approveProductAction({ productId })
            : await rejectProductAction({ productId });

        if(result.success) {
            setPendingProducts(prev => prev.filter(p => p.id !== productId));
            toast({
                title: `Product ${action}d`,
                description: `The product has been successfully ${action}d.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: `Error ${action}ing Product`,
                description: result.error || 'An unknown error occurred.',
            });
        }
        setProcessingId(null);
    });
  };
  
  const getUserName = (sellerId: string) => {
    return users.find(u => u.id === sellerId)?.name || 'Unknown Seller';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Approvals</h1>
        <p className="text-muted-foreground">Review and approve or reject new product submissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Products</CardTitle>
          <CardDescription>
            There are {pendingProducts.length} product(s) awaiting review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Price (USD)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingProducts.length > 0 ? (
                pendingProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                      <div className="relative h-16 w-16 overflow-hidden rounded-md">
                        <Image
                            src={product.images[0] || 'https://placehold.co/100x100'}
                            alt={product.title}
                            fill
                            className="object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>{getUserName(product.sellerId)}</TableCell>
                    <TableCell>${product.priceUSD.toFixed(2)}</TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-green-600 border-green-600 hover:bg-green-100 hover:text-green-700"
                            onClick={() => handleAction('approve', product.id)}
                            disabled={isProcessing}
                        >
                            {isProcessing && processingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            <span className="sr-only">Approve</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={() => handleAction('reject', product.id)}
                            disabled={isProcessing}
                        >
                           {isProcessing && processingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            <span className="sr-only">Reject</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No pending products to review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
