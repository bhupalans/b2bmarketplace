
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
import { Check, X, Loader2, FileSearch, ExternalLink } from "lucide-react";
import { User, VerificationTemplate } from '@/lib/types';
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
import { updateUserVerificationStatusClient, getVerificationTemplatesClient } from '@/lib/firebase';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { countries } from '@/lib/geography-data';
import { RejectionReasonDialog } from '@/components/rejection-reason-dialog';

interface AdminVerificationsClientPageProps {
    initialUsers: User[];
}

const DocumentReviewItem: React.FC<{ label: string, doc?: { url: string, fileName: string } }> = ({ label, doc }) => {
    if (!doc) return null;
    return (
        <div className="flex items-center justify-between rounded-md border p-3">
            <div>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{doc.fileName}</p>
            </div>
            <Button asChild variant="secondary" size="sm">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Document
                </a>
            </Button>
        </div>
    );
};

export function AdminVerificationsClientPage({ initialUsers }: AdminVerificationsClientPageProps) {
  const [pendingUsers, setPendingUsers] = useState<User[]>(initialUsers);
  const [verificationTemplates, setVerificationTemplates] = useState<VerificationTemplate[]>([]);
  const [processingState, setProcessingState] = useState<'approving' | 'rejecting' | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewingUser, setReviewingUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);

  React.useEffect(() => {
    getVerificationTemplatesClient().then(setVerificationTemplates);
  }, []);
  
  const activeTemplate = useMemo(() => {
    if (!reviewingUser?.address?.country) return null;
    return verificationTemplates.find(t => t.id === reviewingUser.address.country) || null;
  }, [reviewingUser, verificationTemplates]);

  const handleAction = async (action: 'approve' | 'reject', userId: string, reason?: string) => {
    setProcessingState(action === 'approve' ? 'approving' : 'rejecting');
    startTransition(async () => {
        if (!user || user.role !== 'admin') {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be an admin to perform this action.' });
             setProcessingState(null);
             return;
        }

        try {
            await updateUserVerificationStatusClient(userId, action === 'approve' ? 'verified' : 'rejected', reason);
            setPendingUsers(prev => prev.filter(p => p.id !== userId));
            toast({
                title: `Seller ${action}d`,
                description: `The seller has been successfully ${action}d.`,
            });
            setReviewingUser(null);
        } catch (error: any) {
            console.error("Error updating user verification status:", error);
            toast({
                variant: 'destructive',
                title: `Error ${action}ing Seller`,
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setProcessingState(null);
        }
    });
  };
  
  const getCountryName = (countryCode: string) => {
      return countries.find(c => c.value === countryCode)?.label || countryCode;
  }

  const handleOpenReview = (userToReview: User) => {
    setReviewingUser(userToReview);
  }
  
  const handleOpenRejectionDialog = (userToReject: User) => {
    setRejectingUser(userToReject);
  }

  const handleCloseReview = () => {
    if (!processingState) {
      setReviewingUser(null);
    }
  }

  const handleConfirmRejection = (reason: string) => {
    if (rejectingUser) {
        handleAction('reject', rejectingUser.id, reason);
    }
    setRejectingUser(null);
  };


  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seller Verifications</h1>
        <p className="text-muted-foreground">Review and approve or reject new seller verification submissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>
            There are {pendingUsers.length} seller(s) awaiting verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.length > 0 ? (
                pendingUsers.map((pUser) => (
                  <TableRow key={pUser.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <Avatar className="h-8 w-8 border">
                            <AvatarImage src={pUser.avatar} alt={pUser.name} />
                            <AvatarFallback>{pUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {pUser.name}
                    </TableCell>
                    <TableCell>{pUser.companyName || 'N/A'}</TableCell>
                    <TableCell>{pUser.address?.country ? getCountryName(pUser.address.country) : 'N/A'}</TableCell>
                    <TableCell>{pUser.verificationDocuments ? 'Recent' : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenReview(pUser)}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            Review
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No pending verifications to review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {reviewingUser && (
        <Dialog open={!!reviewingUser} onOpenChange={(isOpen) => !isOpen && handleCloseReview()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Review Verification: {reviewingUser.name}</DialogTitle>
              <DialogDescription>
                Company: {reviewingUser.companyName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Submitted Business Information</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {activeTemplate?.fields.map(field => {
                            const value = reviewingUser.verificationDetails?.[field.name];
                            if (!value) return null;
                            return (
                                <React.Fragment key={field.name}>
                                    <div className="font-medium">{field.label}</div>
                                    <div>{value}</div>
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Submitted Documents</h3>
                <div className="space-y-3">
                    {activeTemplate?.fields.length ? (
                        activeTemplate.fields.map(field => (
                            <DocumentReviewItem 
                                key={field.name}
                                label={field.label}
                                doc={reviewingUser.verificationDocuments?.[field.name]}
                            />
                        ))
                    ) : <p className="text-sm text-muted-foreground">No business documents were required for this country.</p>}

                     <DocumentReviewItem 
                        label="Address Proof"
                        doc={reviewingUser.verificationDocuments?.addressProof}
                    />

                    <DocumentReviewItem 
                        label="ID Proof"
                        doc={reviewingUser.verificationDocuments?.idProof}
                    />
                </div>
              </div>

            </div>
            <DialogFooter>
                <Button 
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-100 hover:text-red-700"
                    onClick={() => handleOpenRejectionDialog(reviewingUser)}
                    disabled={!!processingState}
                >
                   {processingState === 'rejecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                    Reject
                </Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('approve', reviewingUser.id)}
                    disabled={!!processingState}
                >
                    {processingState === 'approving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    Approve
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
     <RejectionReasonDialog
        open={!!rejectingUser}
        onOpenChange={() => setRejectingUser(null)}
        onConfirm={handleConfirmRejection}
        isSubmitting={processingState === 'rejecting'}
     />
    </>
  );
}
