
"use client";

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { clearAllProducts, clearAllConversationsAndOffers, clearAllNonAdminUsers } from '@/app/admin-data-actions';

type ActionType = 'products' | 'conversations' | 'users';

export default function DataToolsPage() {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [actionToConfirm, setActionToConfirm] = useState<ActionType | null>(null);
    const { toast } = useToast();

    const CONFIRMATION_WORD = "DELETE";

    const getActionDetails = (action: ActionType | null) => {
        switch (action) {
            case 'products':
                return {
                    title: 'Clear All Products',
                    description: 'This will permanently delete all products from the database and all associated images from storage. This action is irreversible.',
                    handler: clearAllProducts,
                };
            case 'conversations':
                return {
                    title: 'Clear Conversations & Offers',
                    description: 'This will permanently delete all conversations, messages, and offers. This is useful for clearing test negotiation data.',
                    handler: clearAllConversationsAndOffers,
                };
            case 'users':
                return {
                    title: 'Clear Non-Admin Users',
                    description: 'This will permanently delete all users from Firebase Authentication and Firestore, except for your primary admin account. Associated data like products may remain but will be orphaned.',
                    handler: clearAllNonAdminUsers,
                };
            default:
                return { title: '', description: '', handler: async () => ({ success: false, error: 'No action selected.' }) };
        }
    };
    
    const handleInitiateAction = (action: ActionType) => {
        setActionToConfirm(action);
        setDialogOpen(true);
    };

    const handleConfirmAction = () => {
        if (!actionToConfirm) return;
        const { handler, title } = getActionDetails(actionToConfirm);

        startTransition(async () => {
            const result = await handler();
            if (result.success) {
                toast({
                    title: 'Action Successful',
                    description: result.message || `${title} completed.`,
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Action Failed',
                    description: result.error || 'An unknown error occurred.',
                });
            }
            handleCloseDialog();
        });
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setConfirmationText('');
        setActionToConfirm(null);
    };
    
    if (user?.role !== 'admin') {
      return (
        <div className="flex justify-center items-center h-full">
          <p>You do not have permission to view this page.</p>
        </div>
      );
    }

    const { title, description } = getActionDetails(actionToConfirm);

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Tools</h1>
                    <p className="text-muted-foreground">Tools for managing and resetting test data.</p>
                </div>

                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Danger Zone</AlertTitle>
                    <AlertDescription>
                        The actions on this page are irreversible and will permanently delete data. Use with extreme caution.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>Clear Products</CardTitle>
                        <CardDescription>Delete all products and their associated images from Firebase Storage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => handleInitiateAction('products')}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Clear All Products
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Clear Conversations & Offers</CardTitle>
                        <CardDescription>Delete all conversations, messages, and offers across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => handleInitiateAction('conversations')}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Clear Conversations & Offers
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Clear Non-Admin Users</CardTitle>
                        <CardDescription>Delete all users except the default admin account from both Firebase Auth and Firestore.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => handleInitiateAction('users')}>
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Clear All Users
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
             <AlertDialog open={dialogOpen} onOpenChange={!isPending ? setDialogOpen : undefined}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           {description} To confirm, please type <strong>{CONFIRMATION_WORD}</strong> in the box below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                     <Input 
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder={`Type "${CONFIRMATION_WORD}" to confirm`}
                        disabled={isPending}
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseDialog} disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                         onClick={handleConfirmAction}
                         disabled={isPending || confirmationText !== CONFIRMATION_WORD}
                         className="bg-destructive hover:bg-destructive/90"
                        >
                            {isPending && <Loader2 className="mr-2 animate-spin" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
