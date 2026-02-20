
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BrandingSettings } from '@/lib/types';
import { updateBrandingSettings } from '@/app/admin-actions';

const brandingSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  headline: z.string().min(1, "Headline is required."),
  subhead: z.string().min(1, "Sub-headline is required."),
});

type BrandingSettingsFormData = z.infer<typeof brandingSettingsSchema>;

interface BrandingSettingsProps {
  initialBranding: BrandingSettings;
}

export function BrandingSettingsForm({ initialBranding }: BrandingSettingsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<BrandingSettingsFormData>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: initialBranding || {
      companyName: 'B2B Marketplace',
      headline: 'The Global B2B Marketplace',
      subhead: 'Connect with verified suppliers, find quality products, or post your sourcing needs to get competitive quotes.',
    },
  });

  const onSubmit = (data: BrandingSettingsFormData) => {
    startTransition(async () => {
      try {
        const result = await updateBrandingSettings(data);
        if (result.success) {
            toast({
              title: 'Branding Settings Saved',
              description: 'Your new branding has been applied across the site.',
            });
        } else {
            throw new Error(result.error);
        }
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
    <Card>
      <CardHeader>
        <CardTitle>Platform Branding</CardTitle>
        <CardDescription>
          Customize the main branding and homepage text for your marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Velocity Global Trade" {...field} />
                  </FormControl>
                  <FormDescription>
                    The official name of your marketplace, used in the footer and page titles.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Homepage Headline</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Future of Global Trade" {...field} />
                  </FormControl>
                  <FormDescription>
                    The main headline displayed on the homepage hero section.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subhead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Homepage Sub-headline</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe your value proposition" {...field} />
                  </FormControl>
                  <FormDescription>
                    The smaller text under the main headline on the homepage.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Branding
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
