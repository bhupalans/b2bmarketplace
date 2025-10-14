
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SourcingRequest } from '@/lib/types';
import { getSourcingRequestsClient, deleteSourcingRequestClient } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import Link from 'next/link';

export default function MySourcingRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestToDelete, setRequestToDelete] = useState<SourcingRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRequests = useCallback(async (buyerId: string) => {
    try {
      const userRequests = await getSourcingRequestsClient({ buyerId });
      setRequests(userRequests);
    } catch (error) {
      console.error("Failed to fetch sourcing requests:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load your requests.' });
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === 'buyer') {
      setLoading(true);
      fetchRequests(user.uid).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchRequests]);

  const handleDeleteInitiate = (request: SourcingRequest) => {
    setRequestToDelete(request);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSourcingRequestClient(requestToDelete.id);
      setRequests(prev => prev.filter(r => r.id !== requestToDelete.id));
      toast({ title: 'Request Deleted', description: 'Your sourcing request has been removed.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Deleting Request', description: error.message });
    } finally {
      setIsDeleting(false);
      setRequestToDelete(null);
    }
  };

  const getStatusVariant = (status: SourcingRequest['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'closed': return 'outline';
      case 'expired': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading || authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (user?.role !== 'buyer') {
      return <div className="text-center py-10">You must be a buyer to view this page.</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Sourcing Requests</h1>
            <p className="text-muted-foreground">Manage your active and past sourcing requests.</p>
          </div>
          <Button asChild>
            <Link href="/sourcing/create">
              <PlusCircle className="mr-2" />
              Post New Request
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Requests</CardTitle>
            <CardDescription>You have posted {requests.length} request(s).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <Link href={`/sourcing/${request.id}`} className="hover:underline">
                            {request.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(request.status)} className="capitalize">{request.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.expiresAt as string), 'PPP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={request.status === 'active'}
                              onClick={() => handleDeleteInitiate(request)}
                              className="text-red-500 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      You haven't posted any sourcing requests yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <DeleteConfirmationDialog
        open={!!requestToDelete}
        onOpenChange={() => setRequestToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemType="sourcing request"
        itemName={requestToDelete?.title}
        isDeleting={isDeleting}
      />
    </>
  );
}
