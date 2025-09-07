
"use client";

import React, { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Form, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { saveProductUpdateRulesClient } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

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
}

export function SettingsClientPage({ initialRules }: SettingsClientPageProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Marketplace Settings</h1>
            <p className="text-muted-foreground">Configure rules and settings for your marketplace.</p>
        </div>
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
    </div>
  );
}
