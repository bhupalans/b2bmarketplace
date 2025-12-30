
"use client";

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormDescription, FormControl } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { saveProductUpdateRulesClient } from '@/lib/firebase';
import { Loader2, Clock } from 'lucide-react';
import { PaymentGateway, BrandingSettings } from '@/lib/types';
import { PaymentGatewaySettings } from './payment-gateway-settings';
import { BrandingSettingsForm } from './branding-settings';
import { sendSubscriptionReminders } from '@/app/cron-actions';

const productFields = [
    { id: 'priceUSD', label: 'Price (USD)' },
    { id: 'stockAvailability', label: 'Stock Availability' },
    { id: 'moq', label: 'Minimum Order Quantity' },
    { id: 'moqUnit', label: 'MOQ Unit' },
    { id: 'leadTime', label: 'Lead Time' },
    { id: 'sku', label: 'SKU / Model No.' },
] as const;


const settingsSchema = z.object({
  autoApproveFields: z.array(z.string()).optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsClientPageProps {
  initialRules: string[];
  initialPaymentGateways: PaymentGateway[];
  initialBranding: BrandingSettings;
}

export function SettingsClientPage({ initialRules, initialPaymentGateways, initialBranding }: SettingsClientPageProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSendingReminders, startSendingReminders] = useTransition();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      autoApproveFields: initialRules || [],
    },
  });

  const onSubmit = (data: SettingsFormData) => {
    startTransition(async () => {
      try {
        await saveProductUpdateRulesClient(data.autoApproveFields || []);
        toast({
          title: 'Settings Saved',
          description: 'Your auto-approval rules have been updated.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error Saving Settings',
          description: error.message || 'An unknown error occurred.',
        });
      }
    });
  };
  
  const handleSendReminders = () => {
    startSendingReminders(async () => {
      try {
        const result = await sendSubscriptionReminders();
        if (result.success) {
          toast({
            title: 'Action Complete',
            description: result.message,
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Action Failed',
          description: error.message || 'Could not send reminders.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace Settings</h1>
            <p className="text-muted-foreground">Configure rules and settings for your marketplace.</p>
        </div>

        <BrandingSettingsForm initialBranding={initialBranding} />

        <Card>
            <CardHeader>
                <CardTitle>Manual Actions</CardTitle>
                <CardDescription>
                    Trigger backend processes manually. Use these if automated systems fail.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="font-semibold">Subscription Reminders</h3>
                        <p className="text-sm text-muted-foreground">Check for upcoming subscription expiries and send reminder emails to users.</p>
                    </div>
                    <Button onClick={handleSendReminders} disabled={isSendingReminders}>
                        {isSendingReminders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Clock className="mr-2 h-4 w-4" />
                        Send Reminders
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Product Auto-Approval</CardTitle>
                <CardDescription>
                    Select which product fields a seller can edit without requiring admin re-approval. 
                    If a seller edits any field not selected here, the product will be set to "pending" for manual review.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="autoApproveFields"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Auto-Approved Fields</FormLabel>
                                    <FormDescription>
                                        Check the fields you want to allow sellers to update instantly.
                                    </FormDescription>
                                </div>
                                <div className="space-y-3">
                                    {productFields.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={form.control}
                                        name="autoApproveFields"
                                        render={({ field }) => {
                                        return (
                                            <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value?.includes(item.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...(field.value || []), item.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== item.id
                                                        )
                                                    )
                                                }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                {item.label}
                                            </FormLabel>
                                            </FormItem>
                                        )
                                        }}
                                    />
                                    ))}
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="flex justify-end">
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                         </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <PaymentGatewaySettings initialGateways={initialPaymentGateways} />
    </div>
  );
}
