
"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import { createSourcingRequestClient, getActiveCategoriesClient } from "@/lib/firebase";
import { Category, SourcingRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { add } from "date-fns";

const requestSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters.").max(100, "Title is too long."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description is too long."),
  categoryId: z.string().min(1, "Please select a relevant category."),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number."),
  quantityUnit: z.string().min(1, "Please specify a unit (e.g., pieces, kg)."),
  targetPriceUSD: z.coerce.number().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90),
});

type SourcingRequestFormData = z.infer<typeof requestSchema>;

export default function CreateSourcingRequestPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);

  React.useEffect(() => {
    getActiveCategoriesClient().then(setCategories);
  }, []);

  const form = useForm<SourcingRequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      quantity: "" as any,
      quantityUnit: "units",
      targetPriceUSD: "" as any,
      expiresInDays: 30,
    },
  });

  const onSubmit = (values: SourcingRequestFormData) => {
    if (!user || user.role !== 'buyer') {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only buyers can post sourcing requests.' });
      return;
    }

    startTransition(async () => {
      try {
        const expiresAt = add(new Date(), { days: values.expiresInDays });
        const requestData = {
            ...values,
            expiresAt,
        }
        const newRequest = await createSourcingRequestClient(requestData, user);
        toast({
          title: "Request Posted",
          description: "Your sourcing request is now live for sellers to view.",
        });
        router.push(`/sourcing/${newRequest.id}`);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  if (authLoading || categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post a Sourcing Request</h1>
        <p className="text-muted-foreground">
          Let suppliers find you. Describe what you need, and get quotes directly.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Provide a clear and concise description of the product you're looking for.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Bulk order of N95 face masks" {...field} />
                    </FormControl>
                    <FormDescription>A short, descriptive headline for your request.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the most relevant product category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Include specifications, required certifications (e.g., CE, FDA), material preferences, and any other important details."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quantity & Price</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Required Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 10000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantityUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., units" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="targetPriceUSD"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Price per Unit (USD)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormDescription>Your ideal price, if you have one.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="expiresInDays"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Request Active For</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="7">7 Days</SelectItem>
                                    <SelectItem value="15">15 Days</SelectItem>
                                    <SelectItem value="30">30 Days</SelectItem>
                                    <SelectItem value="60">60 Days</SelectItem>
                                    <SelectItem value="90">90 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormDescription>How long sellers can respond to your request.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Sourcing Request
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
