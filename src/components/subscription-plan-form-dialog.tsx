
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubscriptionPlan } from '@/lib/types';
import { createOrUpdateSubscriptionPlanClient } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

interface SubscriptionPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId?: string | null;
  onSuccess: (plan: SubscriptionPlan) => void;
  allPlans: SubscriptionPlan[];
}

export function SubscriptionPlanFormDialog({ open, onOpenChange, planId, onSuccess, allPlans }: SubscriptionPlanFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const planNameExists = (name: string) => {
    return allPlans.some(p => p.name.toLowerCase() === name.toLowerCase() && p.id !== planId);
  };

  const planSchema = z.object({
    name: z.string().min(3, 'Plan name must be at least 3 characters.').refine(name => !planNameExists(name), 'A plan with this name already exists.'),
    price: z.coerce.number().min(0, 'Price must be a non-negative number.'),
    type: z.enum(['seller', 'buyer']),
    productLimit: z.coerce.number().int('Limit must be a whole number.').min(-1, 'Limit must be -1 or greater.').optional(),
    sourcingRequestLimit: z.coerce.number().int('Limit must be a whole number.').min(-1, 'Limit must be -1 or greater.').optional(),
    hasAnalytics: z.boolean(),
    isFeatured: z.boolean(),
    status: z.enum(['active', 'archived']),
  }).refine(data => {
      if (data.type === 'seller' && (data.productLimit === null || data.productLimit === undefined)) {
          return false;
      }
      return true;
  }, {
      message: 'Product limit is required for seller plans.',
      path: ['productLimit'],
  }).refine(data => {
    if (data.type === 'buyer' && (data.sourcingRequestLimit === null || data.sourcingRequestLimit === undefined)) {
        return false;
    }
    return true;
}, {
    message: 'Sourcing request limit is required for buyer plans.',
    path: ['sourcingRequestLimit'],
});

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      price: 0,
      type: 'seller',
      productLimit: 0,
      sourcingRequestLimit: 0,
      hasAnalytics: false,
      isFeatured: false,
      status: 'active',
    },
  });

  const watchedPlanType = useWatch({
    control: form.control,
    name: 'type',
  });


  useEffect(() => {
    const fetchPlan = () => {
      if (planId) {
        setIsLoading(true);
        const plan = allPlans.find(p => p.id === planId);
        if (plan) {
          form.reset({
              ...plan,
              type: plan.type || 'seller', // Default old plans to 'seller'
          });
        }
        setIsLoading(false);
      } else {
        form.reset({
          name: '',
          price: 0,
          type: 'seller',
          productLimit: 0,
          sourcingRequestLimit: 0,
          hasAnalytics: false,
          isFeatured: false,
          status: 'active',
        });
      }
    };

    if (open) {
      fetchPlan();
    }
  }, [planId, open, form, allPlans]);

  const onSubmit = async (values: z.infer<typeof planSchema>) => {
    setIsSaving(true);
    try {
      const savedPlan = await createOrUpdateSubscriptionPlanClient({ ...values, currency: 'USD' }, planId);
      toast({
        title: planId ? 'Plan Updated' : 'Plan Created',
        description: `The plan "${savedPlan.name}" has been saved.`,
      });
      onSuccess(savedPlan);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{planId ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
          <DialogDescription>
            Configure the pricing and feature entitlements for this subscription tier.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Plan Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="seller" id="type-seller" /></FormControl>
                                <FormLabel htmlFor="type-seller" className="font-normal">Seller Plan</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="buyer" id="type-buyer" /></FormControl>
                                <FormLabel htmlFor="type-buyer" className="font-normal">Buyer Plan</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Premium" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Price (USD per month)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 49.99" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>

              <Separator />
              <h3 className="text-md font-medium">Feature Limits</h3>
              
                {watchedPlanType === 'seller' ? (
                     <FormField
                        control={form.control}
                        name="productLimit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Product Listing Limit</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Enter -1 for unlimited products.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                ) : (
                    <FormField
                        control={form.control}
                        name="sourcingRequestLimit"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sourcing Request Limit</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Enter -1 for unlimited requests.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
             

              <Separator />
              <h3 className="text-md font-medium">Feature Flags</h3>

              <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="hasAnalytics"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Enable Analytics</FormLabel>
                                <FormDescription>
                                    Allow access to the seller/buyer dashboard.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Featured Plan</FormLabel>
                                <FormDescription>
                                    Grants a "Premium" badge on profiles.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="active" id="status-active" /></FormControl>
                          <FormLabel htmlFor="status-active" className="font-normal">Active</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl><RadioGroupItem value="archived" id="status-archived" /></FormControl>
                          <FormLabel htmlFor="status-archived" className="font-normal">Archived</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
