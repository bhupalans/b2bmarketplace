
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PlanTable = ({ 
  plans, 
  onEdit, 
  onDelete 
}: { 
  plans: SubscriptionPlan[]; 
  onEdit: (planId: string) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}) => {
  const formatLimit = (limit: number | undefined) => {
    if (limit === undefined || limit === null) return 'N/A';
    return limit === -1 ? 'Unlimited' : limit;
  };
  
  const planType = plans[0]?.type || 'seller';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan Name</TableHead>
          <TableHead>Price</TableHead>
          {planType === 'seller' ? (
            <TableHead>Product Limit</TableHead>
          ) : (
            <TableHead>Sourcing Req. Limit</TableHead>
          )}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.length > 0 ? (
          plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell>{(plan.price || 0).toLocaleString(undefined, { style: 'currency', currency: plan.currency || 'USD' })} / year</TableCell>
              <TableCell>
                {planType === 'seller' ? formatLimit(plan.productLimit) : formatLimit(plan.sourcingRequestLimit)}
              </TableCell>
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
                    <DropdownMenuItem onClick={() => onEdit(plan.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500 hover:text-red-600 focus:text-red-600"
                      onClick={() => onDelete(plan)}
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
              No plans found. Get started by creating one!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
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

  const sellerPlans = useMemo(() => plans.filter(p => p.type === 'seller' || !p.type).sort((a,b) => a.price - b.price), [plans]);
  const buyerPlans = useMemo(() => plans.filter(p => p.type === 'buyer').sort((a,b) => a.price - b.price), [plans]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage pricing and feature tiers for sellers and buyers.</p>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2" />
          Create Plan
        </Button>
      </div>

      <Tabs defaultValue="seller">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="seller">Seller Plans</TabsTrigger>
          <TabsTrigger value="buyer">Buyer Plans</TabsTrigger>
        </TabsList>
        <TabsContent value="seller">
            <Card>
                <CardHeader>
                    <CardTitle>Plans for Sellers</CardTitle>
                    <CardDescription>
                        You have {sellerPlans.length} plan(s) defined for sellers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanTable plans={sellerPlans} onEdit={handleEdit} onDelete={handleDeleteInitiate} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="buyer">
            <Card>
                <CardHeader>
                    <CardTitle>Plans for Buyers</CardTitle>
                    <CardDescription>
                       You have {buyerPlans.length} plan(s) defined for buyers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanTable plans={buyerPlans} onEdit={handleEdit} onDelete={handleDeleteInitiate} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>


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
    </div>
  );
}
