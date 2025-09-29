
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
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { SubscriptionPlan } from '@/lib/types';
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
import { SubscriptionPlanFormDialog } from '@/components/subscription-plan-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteSubscriptionPlanClient } from '@/lib/firebase';

interface SubscriptionsClientPageProps {
  initialPlans: SubscriptionPlan[];
}

export function SubscriptionsClientPage({ initialPlans }: SubscriptionsClientPageProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  const handleCreate = useCallback(() => {
    setSelectedPlanId(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setFormOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setSelectedPlanId(null);
    }
  }, []);

  const handleFormSuccess = useCallback((savedPlan: SubscriptionPlan) => {
    setPlans(prev => {
      const index = prev.findIndex(p => p.id === savedPlan.id);
      if (index > -1) {
        const newPlans = [...prev];
        newPlans[index] = savedPlan;
        return newPlans;
      }
      return [...prev, savedPlan];
    });
    setFormOpen(false);
    setSelectedPlanId(null);
  }, []);

  const handleDeleteInitiate = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      await deleteSubscriptionPlanClient(planToDelete.id);
      setPlans(prev => prev.filter(p => p.id !== planToDelete.id));
      toast({
        title: 'Plan Deleted',
        description: `The plan "${planToDelete.name}" has been successfully removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Plan',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setPlanToDelete(null);
    }
  };
  
  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
            <p className="text-muted-foreground">Manage pricing and feature tiers for sellers.</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2" />
            Create Plan
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan List</CardTitle>
            <CardDescription>
              You have {plans.length} plan(s) defined for sellers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Product Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>${plan.price.toFixed(2)} / month</TableCell>
                      <TableCell>{formatLimit(plan.productLimit)}</TableCell>
                      <TableCell>
                         <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                            {plan.status}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleEdit(plan.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500 hover:text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteInitiate(plan)}
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No subscription plans found. Get started by creating one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <SubscriptionPlanFormDialog
        key={selectedPlanId || 'new'}
        open={isFormOpen}
        onOpenChange={handleDialogClose}
        planId={selectedPlanId}
        onSuccess={handleFormSuccess}
        allPlans={plans}
      />

      <DeleteConfirmationDialog
        open={!!planToDelete}
        onOpenChange={(isOpen) => !isOpen && setPlanToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemType="subscription plan"
        itemName={planToDelete?.name}
      />
    </>
  );
}
