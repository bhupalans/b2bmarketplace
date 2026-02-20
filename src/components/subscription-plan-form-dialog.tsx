
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubscriptionPlan, RegionalPrice } from '@/lib/types';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { countries } from '@/lib/geography-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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

  const regionalPriceSchema = z.object({
      country: z.string().min(2, 'Country code is required.'),
      price: z.coerce.number().min(0, 'Price must be non-negative.'),
      currency: z.string().min(3, 'Currency code is required.').max(3, 'Currency must be 3 letters.'),
  });

  const planSchema = z.object({
    name: z.string().min(3, 'Plan name must be at least 3 characters.').refine(name => !planNameExists(name), 'A plan with this name already exists.'),
    price: z.coerce.number().min(0, 'Price must be a non-negative number.'),
    currency: z.string().min(3, 'Currency code is required (e.g., USD).').max(3, 'Currency code must be 3 letters.'),
    pricing: z.array(regionalPriceSchema).optional(),
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
      currency: 'USD',
      pricing: [],
      type: 'seller',
      productLimit: 0,
      sourcingRequestLimit: 0,
      hasAnalytics: false,
      isFeatured: false,
      status: 'active',
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pricing"
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
              type: plan.type || 'seller',
              currency: plan.currency || 'USD',
              pricing: plan.pricing || [],
          });
        }
        setIsLoading(false);
      } else {
        form.reset({
          name: '',
          price: 0,
          currency: 'USD',
          pricing: [],
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
      const savedPlan = await createOrUpdateSubscriptionPlanClient({ ...values, currency: values.currency.toUpperCase() }, planId);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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
          <div className="flex-grow overflow-y-auto pr-6 -mr-6">
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
                
                <Separator />
                <h3 className="text-md font-medium">Default Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Default Price</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 49.99" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., USD" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>

              <Separator />
              <h3 className="text-md font-medium">Regional Pricing (Optional)</h3>
              <div className="space-y-4">
                  {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
                          <FormField
                              control={form.control}
                              name={`pricing.${index}.country`}
                              render={({ field }) => (
                                  <FormItem className="flex-1">
                                      <FormLabel>Country</FormLabel>
                                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              {countries.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name={`pricing.${index}.price`}
                              render={({ field }) => (
                                  <FormItem className="flex-1">
                                      <FormLabel>Price</FormLabel>
                                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <FormField
                              control={form.control}
                              name={`pricing.${index}.currency`}
                              render={({ field }) => (
                                  <FormItem className="flex-1">
                                      <FormLabel>Currency</FormLabel>
                                      <FormControl><Input placeholder="INR" {...field} /></FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                           <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ country: '', price: 0, currency: ''})}>
                      <Plus className="mr-2 h-4 w-4" /> Add Regional Price
                  </Button>
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

              <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
