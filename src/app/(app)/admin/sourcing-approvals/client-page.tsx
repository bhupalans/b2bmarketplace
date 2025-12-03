
"use client";

import React, { useState, useTransition, useMemo } from 'react';
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
import { SourcingRequest, User, Category } from '@/lib/types';
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
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { RejectionReasonDialog } from '@/components/rejection-reason-dialog';
import { useCurrency } from '@/contexts/currency-context';
import { convertPrice, convertPriceToUSD } from '@/lib/currency';
import { updateSourcingRequestStatusAction } from '@/app/admin-sourcing-actions';

interface AdminSourcingApprovalsClientPageProps {
    initialRequests: SourcingRequest[];
    initialUsers: User[];
    initialCategories: Category[];
}

export function SourcingApprovalsClientPage({ initialRequests, initialUsers, initialCategories }: AdminSourcingApprovalsClientPageProps) {
  const [pendingRequests, setPendingRequests] = useState<SourcingRequest[]>(initialRequests);
  const [users] = useState<User[]>(initialUsers);
  const categoryMap = useMemo(() => new Map(initialCategories.map(c => [c.id, c])), [initialCategories]);

  const [processingState, setProcessingState] = useState<'approving' | 'rejecting' | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewingRequest, setReviewingRequest] = useState<SourcingRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectingRequest, setRejectingRequest] = useState<SourcingRequest | null>(null);
  const { currency, rates } = useCurrency();

  const getPriceInUSD = (price?: { baseAmount: number; baseCurrency: string }) => {
    if (!price) return 0;
    return convertPriceToUSD(price, rates);
  };


  const handleAction = async (action: 'approve' | 'reject', request: SourcingRequest, reason?: string) => {
    setProcessingState(action === 'approve' ? 'approving' : 'rejecting');
    startTransition(async () => {
        if (!user || user.role !== 'admin') {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be an admin to perform this action.' });
             setProcessingState(null);
             return;
        }

        try {
            const result = await updateSourcingRequestStatusAction(request.id, action, reason);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            setPendingRequests(prev => prev.filter(r => r.id !== request.id));
            toast({
                title: `Request ${action}d`,
                description: `The sourcing request has been successfully ${action}d.`,
            });
            setReviewingRequest(null);
        } catch (error: any) {
            console.error("Error updating sourcing request status:", error);
            toast({
                variant: 'destructive',
                title: `Error ${action}ing Request`,
                description: error.message || 'An unknown error occurred. Check Firestore rules and permissions.',
            });
        } finally {
            setProcessingState(null);
        }
    });
  };
  
  const getBuyerName = (buyerId: string) => {
    return users.find(u => u.id === buyerId || u.uid === buyerId)?.name || 'Unknown Buyer';
  };
  
  const getCategoryPath = (categoryId: string): string => {
    if (!categoryMap || categoryMap.size === 0) return 'N/A';
    
    const path: string[] = [];
    let currentId: string | null = categoryId;

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

  const handleOpenReview = (request: SourcingRequest) => {
    setReviewingRequest(request);
  }

  const handleCloseReview = () => {
    if (!processingState) {
      setReviewingRequest(null);
    }
  }
  
  const handleOpenRejectionDialog = (requestToReject: SourcingRequest) => {
    setRejectingRequest(requestToReject);
  }

  const handleConfirmRejection = (reason: string) => {
    if (rejectingRequest) {
        handleAction('reject', rejectingRequest, reason);
    }
    setRejectingRequest(null);
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sourcing Approvals</h1>
        <p className="text-muted-foreground">Review and approve or reject new sourcing requests from buyers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Sourcing Requests</CardTitle>
          <CardDescription>
            There are {pendingRequests.length} request(s) awaiting review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{getBuyerName(request.buyerId)}</TableCell>
                    <TableCell>{request.quantity.toLocaleString()} {request.quantityUnit}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenReview(request)}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            Review
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No pending sourcing requests to review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {reviewingRequest && (
        <Dialog open={!!reviewingRequest} onOpenChange={(isOpen) => !isOpen && handleCloseReview()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Request: {reviewingRequest.title}</DialogTitle>
              <DialogDescription>
                Posted by: {getBuyerName(reviewingRequest.buyerId)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Request Details</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="font-medium">Quantity</div>
                    <div>{reviewingRequest.quantity.toLocaleString()} {reviewingRequest.quantityUnit}</div>
                    
                    {reviewingRequest.targetPrice?.baseAmount && (
                        <>
                        <div className="font-medium">Target Price ({currency})</div>
                        <div>
                          ~{new Intl.NumberFormat(undefined, {style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2}).format(convertPrice(reviewingRequest.targetPrice, currency, rates))} / {reviewingRequest.quantityUnit.slice(0, -1)}
                          {currency !== 'USD' && <span className="text-muted-foreground ml-2">({new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD'}).format(getPriceInUSD(reviewingRequest.targetPrice))} USD)</span>}
                        </div>
                        </>
                    )}

                    <div className="font-medium">Category</div>
                    <div>{getCategoryPath(reviewingRequest.categoryId)}</div>

                    <div className="font-medium">Ship to Country</div>
                    <div>{reviewingRequest.buyerCountry}</div>

                    <div className="font-medium">Submitted</div>
                    <div>{reviewingRequest.createdAt && typeof reviewingRequest.createdAt === 'string' ? format(new Date(reviewingRequest.createdAt), 'PPP p') : 'N/A'}</div>

                    <div className="font-medium">Expires</div>
                    <div>{reviewingRequest.expiresAt && typeof reviewingRequest.expiresAt === 'string' ? format(new Date(reviewingRequest.expiresAt), 'PPP p') : 'N/A'}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reviewingRequest.description}</p>
              </div>

            </div>
            <DialogFooter>
                <Button 
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleOpenRejectionDialog(reviewingRequest)}
                    disabled={!!processingState}
                >
                   {processingState === 'rejecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    Reject
                </Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('approve', reviewingRequest)}
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
        open={!!rejectingRequest}
        onOpenChange={() => setRejectingRequest(null)}
        onConfirm={handleConfirmRejection}
        isSubmitting={processingState === 'rejecting'}
     />

    </div>
  );
}
