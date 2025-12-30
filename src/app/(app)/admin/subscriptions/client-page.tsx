
"use client";

import React, { useState, useCallback, useMemo, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Mail } from "lucide-react";
import { SubscriptionPlan, User } from '@/lib/types';
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
import { sendSubscriptionReminders } from '@/app/cron-actions';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays } from 'date-fns';

interface SubscriptionsClientPageProps {
  initialPlans: SubscriptionPlan[];
  initialUsers: User[];
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

const SubscribersTable = ({ users }: { users: User[] }) => {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isSending, startSendTransition] = useTransition();
    const { toast } = useToast();

    const activeSubscribers = useMemo(() => {
        return users.filter(u => u.subscriptionPlanId && u.subscriptionExpiryDate && new Date(u.subscriptionExpiryDate as string) > new Date())
            .sort((a,b) => new Date(a.subscriptionExpiryDate as string).getTime() - new Date(b.subscriptionExpiryDate as string).getTime());
    }, [users]);
    
    const isAllSelected = activeSubscribers.length > 0 && selectedUserIds.length === activeSubscribers.length;

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(activeSubscribers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds(prev => [...prev, userId]);
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId));
        }
    };
    
    const handleSendReminders = () => {
        if (selectedUserIds.length === 0) return;
        startSendTransition(async () => {
            const result = await sendSubscriptionReminders(selectedUserIds);
             if (result.success) {
                toast({
                    title: "Action Complete",
                    description: result.message
                });
                setSelectedUserIds([]);
            } else {
                toast({
                    variant: "destructive",
                    title: "Action Failed",
                    description: result.error
                });
            }
        });
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Active Subscribers</CardTitle>
                    <CardDescription>
                        {activeSubscribers.length} user(s) with an active subscription plan.
                    </CardDescription>
                </div>
                <Button onClick={handleSendReminders} disabled={selectedUserIds.length === 0 || isSending}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminder(s)
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                             <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all rows"
                                />
                             </TableHead>
                             <TableHead>User</TableHead>
                             <TableHead>Role</TableHead>
                             <TableHead>Plan</TableHead>
                             <TableHead>Expires On</TableHead>
                             <TableHead>Days Remaining</TableHead>
                             <TableHead>Last Reminder</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activeSubscribers.length > 0 ? (
                            activeSubscribers.map(user => {
                                const daysRemaining = user.subscriptionExpiryDate ? differenceInDays(new Date(user.subscriptionExpiryDate as string), new Date()) : 0;
                                return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                         <Checkbox
                                            checked={selectedUserIds.includes(user.id)}
                                            onCheckedChange={(checked) => handleSelectUser(user.id, !!checked)}
                                            aria-label={`Select row for ${user.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>{user.name} ({user.email})</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                                    <TableCell>{user.subscriptionPlan?.name || 'N/A'}</TableCell>
                                    <TableCell>{user.subscriptionExpiryDate ? format(new Date(user.subscriptionExpiryDate as string), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={daysRemaining <= 7 ? 'destructive' : daysRemaining <= 30 ? 'secondary' : 'outline'}>
                                            {daysRemaining}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.lastReminderSent ? format(new Date(user.lastReminderSent), 'PPP') : 'Never'}</TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                             <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                No active subscribers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


export function SubscriptionsClientPage({ initialPlans, initialUsers }: SubscriptionsClientPageProps) {
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

      <Tabs defaultValue="plans">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="plans">Manage Plans</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Seller Plans</CardTitle>
                    <CardDescription>
                        You have {sellerPlans.length} plan(s) defined for sellers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanTable plans={sellerPlans} onEdit={handleEdit} onDelete={handleDeleteInitiate} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Buyer Plans</CardTitle>
                    <CardDescription>
                       You have {buyerPlans.length} plan(s) defined for buyers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PlanTable plans={buyerPlans} onEdit={handleEdit} onDelete={handleDeleteInitiate} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="subscribers">
            <SubscribersTable users={initialUsers} />
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
