
"use client";

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Globe } from "lucide-react";
import { PaymentGateway } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { createOrUpdatePaymentGatewayClient, deletePaymentGatewayClient } from '@/lib/firebase';
import { Switch } from '@/components/ui/switch';
import { PaymentGatewayFormDialog } from './payment-gateway-form-dialog';
import Image from 'next/image';

interface PaymentGatewaySettingsProps {
  initialGateways: PaymentGateway[];
}

export function PaymentGatewaySettings({ initialGateways }: PaymentGatewaySettingsProps) {
  const [gateways, setGateways] = useState<PaymentGateway[]>(initialGateways);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGateway | null>(null);
  const { toast } = useToast();

  const handleCreate = useCallback(() => {
    setSelectedGatewayId(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((gatewayId: string) => {
    setSelectedGatewayId(gatewayId);
    setFormOpen(true);
  }, []);
  
  const handleToggle = async (gateway: PaymentGateway) => {
    const optimisticGateways = gateways.map(g => g.id === gateway.id ? { ...g, enabled: !g.enabled } : g);
    setGateways(optimisticGateways);

    try {
      await createOrUpdatePaymentGatewayClient({ ...gateway, enabled: !gateway.enabled }, gateway.id);
      toast({
        title: `Gateway ${!gateway.enabled ? 'Enabled' : 'Disabled'}`,
        description: `"${gateway.name}" has been updated.`
      })
    } catch(error: any) {
      // Revert optimistic update on error
      setGateways(gateways);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setSelectedGatewayId(null);
    }
  }, []);

  const handleFormSuccess = useCallback((savedGateway: PaymentGateway) => {
    setGateways(prev => {
      const index = prev.findIndex(g => g.id === savedGateway.id);
      if (index > -1) {
        const newGateways = [...prev];
        newGateways[index] = savedGateway;
        return newGateways;
      }
      return [...prev, savedGateway];
    });
    setFormOpen(false);
    setSelectedGatewayId(null);
  }, []);

  const handleDeleteInitiate = (gateway: PaymentGateway) => {
    setGatewayToDelete(gateway);
  };

  const handleDeleteConfirm = async () => {
    if (!gatewayToDelete) return;
    try {
      await deletePaymentGatewayClient(gatewayToDelete.id);
      setGateways(prev => prev.filter(p => p.id !== gatewayToDelete.id));
      toast({
        title: 'Gateway Deleted',
        description: `The payment gateway "${gatewayToDelete.name}" has been successfully removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Gateway',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setGatewayToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Gateway Settings</CardTitle>
            <CardDescription>
              Manage payment methods for subscriptions.
            </CardDescription>
          </div>
           <Button onClick={handleCreate}>
            <PlusCircle className="mr-2" />
            Create Gateway
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.length > 0 ? (
                gateways.map((gateway) => (
                  <TableRow key={gateway.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                        <Image src={gateway.logoUrl} alt={gateway.name} width={60} height={20} className="h-auto" />
                    </TableCell>
                    <TableCell>
                       <Switch
                          checked={gateway.enabled}
                          onCheckedChange={() => handleToggle(gateway)}
                          aria-label={`Enable ${gateway.name}`}
                        />
                       <span className="ml-2 text-sm text-muted-foreground">{gateway.enabled ? 'Enabled' : 'Disabled'}</span>
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
                          <DropdownMenuItem onClick={() => handleEdit(gateway.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-500 hover:text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteInitiate(gateway)}
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
                  <TableCell colSpan={3} className="h-24 text-center">
                    No payment gateways found. Get started by creating one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentGatewayFormDialog
        key={selectedGatewayId || 'new'}
        open={isFormOpen}
        onOpenChange={handleDialogClose}
        gatewayId={selectedGatewayId}
        onSuccess={handleFormSuccess}
        allGateways={gateways}
      />

      <DeleteConfirmationDialog
        open={!!gatewayToDelete}
        onOpenChange={(isOpen) => !isOpen && setGatewayToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemType="payment gateway"
        itemName={gatewayToDelete?.name}
      />
    </>
  );
}
