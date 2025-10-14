
"use client";

import React, { useState, useTransition, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import { createSourcingRequestClient, getActiveCategoriesClient, getSourcingRequestsClient, getSourcingRequestClient, updateSourcingRequestClient } from "@/lib/firebase";
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
import { Loader2, AlertTriangle, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { add, differenceInDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

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

function CreateSourcingRequestForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('id');

  const [isSubmitting, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sourcingRequests, setSourcingRequests] = useState<SourcingRequest[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const isEditMode = !!requestId;

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

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
        try {
            const [cats, reqs] = await Promise.all([
                getActiveCategoriesClient(),
                getSourcingRequestsClient({ buyerId: user.uid }),
            ]);
            setCategories(cats);
            setSourcingRequests(reqs);

            if (isEditMode) {
                const requestToEdit = await getSourcingRequestClient(requestId);
                if (requestToEdit && requestToEdit.buyerId === user.uid) {
                    const expiresAt = new Date(requestToEdit.expiresAt as string);
                    const createdAt = new Date(requestToEdit.createdAt as string);
                    const expiresInDays = differenceInDays(expiresAt, createdAt);

                    form.reset({
                        ...requestToEdit,
                        targetPriceUSD: requestToEdit.targetPriceUSD || undefined,
                        expiresInDays: expiresInDays > 0 ? expiresInDays : 1,
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not find the request to edit.' });
                    router.push('/sourcing/my-requests');
                }
            }

        } catch (error) {
            console.error("Error fetching create request data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load necessary data.' });
        } finally {
            setLoadingInitialData(false);
        }
    }
    fetchData();
  }, [user, requestId, isEditMode, toast, router, form]);

  const onSubmit = (values: SourcingRequestFormData) => {
    if (!user || user.role !== 'buyer') {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only buyers can perform this action.' });
      return;
    }

    startTransition(async () => {
      try {
        const expiresAt = add(new Date(), { days: values.expiresInDays });
        const requestData = {
            ...values,
            expiresAt,
        }
        
        if (isEditMode) {
            await updateSourcingRequestClient(requestId, requestData);
            toast({
              title: "Request Updated",
              description: "Your sourcing request has been updated and is pending review.",
            });
        } else {
            await createSourcingRequestClient(requestData, user);
            toast({
              title: "Request Submitted",
              description: "Your sourcing request is pending admin review.",
            });
        }
        
        router.push(`/sourcing/my-requests`);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error.message || "An unexpected error occurred.",
        });
      }
    });
  };

  if (authLoading || loadingInitialData) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const limit = user?.subscriptionPlan?.sourcingRequestLimit ?? 0;
  const count = sourcingRequests.length;
  const canPost = isEditMode || limit === -1 || count < limit;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? 'Edit Sourcing Request' : 'Post a Sourcing Request'}</h1>
        <p className="text-muted-foreground">
          {isEditMode ? 'Update the details of your request below.' : 'Let suppliers find you. Describe what you need, and get quotes directly.'}
        </p>
      </div>

       {!canPost && (
          <Alert>
            <Gem className="h-4 w-4" />
            <AlertTitle>Sourcing Request Limit Reached</AlertTitle>
            <AlertDescription>
                You have posted {count} of {limit} sourcing requests allowed by your current plan.
                <Link href="/profile/subscription" className="font-semibold text-primary hover:underline ml-2">
                Upgrade your plan
                </Link> to post more.
            </AlertDescription>
        </Alert>
       )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <fieldset disabled={!canPost || isSubmitting}>
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
                                <Input type="number" step="0.01" placeholder="Optional" {...field} value={field.value || ''} />
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
                                <Select onValueChange={field.onChange} value={String(field.value)}>
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
                <Button type="submit" size="lg" disabled={!canPost || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Request' : 'Post Sourcing Request'}
                </Button>
            </div>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}

export default function CreateSourcingRequestPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CreateSourcingRequestForm />
        </Suspense>
    )
}
