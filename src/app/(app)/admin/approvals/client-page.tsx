
"use client";

import React, { useState, useTransition } from 'react';
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
import { Check, X, Loader2, FileSearch } from "lucide-react";
import { Product, User, Category } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { updateProductStatus } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { RejectionReasonDialog } from '@/components/rejection-reason-dialog';
import { useCurrency } from '@/contexts/currency-context';

interface AdminApprovalsClientPageProps {
    initialProducts: Product[];
    initialUsers: User[];
    initialCategories: Category[];
}

export function AdminApprovalsClientPage({ initialProducts, initialUsers, initialCategories }: AdminApprovalsClientPageProps) {
  const [pendingProducts, setPendingProducts] = useState<Product[]>(initialProducts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [processingState, setProcessingState] = useState<'approving' | 'rejecting' | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewingProduct, setReviewingProduct] = useState<Product | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectingProduct, setRejectingProduct] = useState<Product | null>(null);
  const { currency, rates } = useCurrency();

  const getConvertedPrice = (priceUSD: number) => {
    if (currency === "USD" || !rates[currency]) {
      return priceUSD;
    }
    return priceUSD * rates[currency];
  };

  const handleAction = async (action: 'approve' | 'reject', productId: string, reason?: string) => {
    setProcessingState(action === 'approve' ? 'approving' : 'rejecting');
    startTransition(async () => {
        if (!user || user.role !== 'admin') {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be an admin to perform this action.' });
             setProcessingState(null);
             return;
        }

        try {
            await updateProductStatus(productId, action === 'approve' ? 'approved' : 'rejected', reason);
            setPendingProducts(prev => prev.filter(p => p.id !== productId));
            toast({
                title: `Product ${action}d`,
                description: `The product has been successfully ${action}d.`,
            });
            setReviewingProduct(null); // Close dialog on success
        } catch (error: any) {
            console.error("Error updating product status:", error);
            toast({
                variant: 'destructive',
                title: `Error ${action}ing Product`,
                description: error.message || 'An unknown error occurred. Check Firestore rules and permissions.',
            });
        } finally {
            setProcessingState(null);
        }
    });
  };
  
  const getUserName = (sellerId: string) => {
    return users.find(u => u.id === sellerId)?.name || 'Unknown Seller';
  };
  
  const getCategoryPath = (categoryId: string): string => {
    const path: string[] = [];
    let currentId: string | null = categoryId;
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    while (currentId) {
        const category = categoryMap.get(currentId);
        if (category) {
            path.unshift(category.name);
            currentId = category.parentId;
        } else {
            currentId = null;
        }
    }
    return path.join(' > ') || 'N/A';
  }

  const getStockLabel = (stock?: string) => {
    switch(stock) {
        case 'in_stock': return 'In Stock';
        case 'out_of_stock': return 'Out of Stock';
        case 'made_to_order': return 'Made to Order';
        default: return 'N/A';
    }
  }


  const handleOpenReview = (product: Product) => {
    setReviewingProduct(product);
  }

  const handleCloseReview = () => {
    if (!processingState) {
      setReviewingProduct(null);
    }
  }
  
  const handleOpenRejectionDialog = (productToReject: Product) => {
    setRejectingProduct(productToReject);
  }

  const handleConfirmRejection = (reason: string) => {
    if (rejectingProduct) {
        handleAction('reject', rejectingProduct.id, reason);
    }
    setRejectingProduct(null);
  };


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
                <TableHead>Price ({currency})</TableHead>
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
                    <TableCell>
                      {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: currency,
                      }).format(getConvertedPrice(product.priceUSD))}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenReview(product)}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            Review
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
      
      {reviewingProduct && (
        <Dialog open={!!reviewingProduct} onOpenChange={(isOpen) => !isOpen && handleCloseReview()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Product: {reviewingProduct.title}</DialogTitle>
              <DialogDescription>
                Sold by: {getUserName(reviewingProduct.sellerId)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Images</h3>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {reviewingProduct.images.map((imgSrc, index) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-square w-full">
                            <Image
                              src={imgSrc}
                              alt={`${reviewingProduct.title} - view ${index + 1}`}
                              fill
                              className="object-cover rounded-md"
                              data-ai-hint="product image"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-2" />
                    <CarouselNext className="absolute right-2" />
                  </Carousel>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Product Details</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="font-medium">Price</div>
                    <div>
                      {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: currency,
                      }).format(getConvertedPrice(reviewingProduct.priceUSD))}
                      {currency !== 'USD' && (
                        <span className="text-muted-foreground ml-1">
                          (${reviewingProduct.priceUSD.toFixed(2)} USD)
                        </span>
                      )}
                    </div>
                    
                    <div className="font-medium">Category</div>
                    <div>{getCategoryPath(reviewingProduct.categoryId)}</div>

                    <div className="font-medium">Minimum Order</div>
                    <div>{reviewingProduct.moq} {reviewingProduct.moqUnit}</div>

                    <div className="font-medium">Stock Availability</div>
                    <div>
                        <Badge 
                        variant={reviewingProduct.stockAvailability === 'in_stock' ? 'default' : 'secondary'} 
                        className="ml-1"
                        >
                            {getStockLabel(reviewingProduct.stockAvailability)}
                        </Badge>
                    </div>

                    <div className="font-medium">Lead Time</div>
                    <div>{reviewingProduct.leadTime}</div>

                    <div className="font-medium">Country of Origin</div>
                    <div>{reviewingProduct.countryOfOrigin}</div>
                    
                    {reviewingProduct.sku && (
                        <>
                        <div className="font-medium">SKU / Model No.</div>
                        <div>{reviewingProduct.sku}</div>
                        </>
                    )}

                    <div className="font-medium">Submitted</div>
                    <div>{reviewingProduct.createdAt && typeof reviewingProduct.createdAt === 'string' ? format(parseISO(reviewingProduct.createdAt), 'PPP p') : 'N/A'}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewingProduct.description}</p>
              </div>

              {reviewingProduct.specifications && reviewingProduct.specifications.length > 0 && (
                <>
                <Separator />
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Technical Specifications</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Specification</TableHead>
                                <TableHead>Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviewingProduct.specifications.map(spec => (
                                <TableRow key={spec.name}>
                                    <TableCell className="font-medium">{spec.name}</TableCell>
                                    <TableCell>{spec.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                </>
              )}
            </div>
            <DialogFooter>
                <Button 
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleOpenRejectionDialog(reviewingProduct)}
                    disabled={!!processingState}
                >
                   {processingState === 'rejecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    Reject
                </Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('approve', reviewingProduct.id)}
                    disabled={!!processingState}
                >
                    {processingState === 'approving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <RejectionReasonDialog
        open={!!rejectingProduct}
        onOpenChange={() => setRejectingProduct(null)}
        onConfirm={handleConfirmRejection}
        isSubmitting={processingState === 'rejecting'}
     />

    </div>
  );
}
