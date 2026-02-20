
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentGateway } from '@/lib/types';
import { createOrUpdatePaymentGatewayClient } from '@/lib/firebase';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface PaymentGatewayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatewayId?: string | null;
  onSuccess: (gateway: PaymentGateway) => void;
  allGateways: PaymentGateway[];
}

export function PaymentGatewayFormDialog({ open, onOpenChange, gatewayId, onSuccess, allGateways }: PaymentGatewayFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const gatewaySchema = z.object({
    id: z.string().min(2, 'ID must be at least 2 characters.').regex(/^[a-z0-9-]+$/, 'ID can only contain lowercase letters, numbers, and hyphens.'),
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    logoUrl: z.string().min(1, 'Logo URL is required.'),
    enabled: z.boolean(),
  }).refine((data) => {
    // On create, check if ID is unique.
    if (!gatewayId) {
      return !allGateways.some(g => g.id === data.id);
    }
    return true;
  }, {
      message: "This ID is already in use by another gateway.",
      path: ['id'],
  });

  const form = useForm<z.infer<typeof gatewaySchema>>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: {
      id: '',
      name: '',
      logoUrl: '',
      enabled: true,
    },
  });

  useEffect(() => {
    const fetchGateway = () => {
      if (gatewayId) {
        setIsLoading(true);
        const gateway = allGateways.find(g => g.id === gatewayId);
        if (gateway) {
          form.reset(gateway);
        }
        setIsLoading(false);
      } else {
        form.reset({ id: '', name: '', logoUrl: '', enabled: true });
      }
    };

    if (open) {
      fetchGateway();
    }
  }, [gatewayId, open, form, allGateways]);

  const onSubmit = async (values: z.infer<typeof gatewaySchema>) => {
    setIsSaving(true);
    try {
      const {id, ...gatewayData} = values;
      const savedGateway = await createOrUpdatePaymentGatewayClient(gatewayData, id);
      toast({
        title: gatewayId ? 'Gateway Updated' : 'Gateway Created',
        description: `The gateway "${savedGateway.name}" has been saved.`,
      });
      onSuccess(savedGateway);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{gatewayId ? 'Edit Gateway' : 'Create New Gateway'}</DialogTitle>
          <DialogDescription>
            Manage a payment method for your marketplace.
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., stripe" {...field} disabled={!!gatewayId} />
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
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Stripe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., /stripe-logo.svg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Enabled</FormLabel>
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
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
