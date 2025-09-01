
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gavel, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState, useTransition, Suspense } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, User } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { getSellerProductsClient, getUsersByIdsClient } from "@/lib/firebase";
import { createOfferServerAction } from "@/app/actions";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const offerSchema = z.object({
  productId: z.string().min(1, { message: "Please select a product." }),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive." }),
  pricePerUnit: z.coerce.number().positive({ message: "Price must be positive." }),
  notes: z.string().optional(),
  buyerId: z.string().min(1),
  conversationId: z.string().min(1),
});

function OffersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, firebaseUser } = useAuth();
  const [isSending, startTransition] = useTransition();
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [buyer, setBuyer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      productId: "",
      quantity: undefined,
      pricePerUnit: undefined,
      notes: "",
      buyerId: "",
      conversationId: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const products = await getSellerProductsClient(user.uid);
        setSellerProducts(products);

        const buyerId = searchParams.get('buyerId');
        if (buyerId) {
          const buyerMap = await getUsersByIdsClient([buyerId]);
          setBuyer(buyerMap.get(buyerId) || null);
        }

        form.reset({
          productId: searchParams.get('productId') || "",
          quantity: searchParams.get('quantity') ? Number(searchParams.get('quantity')) : undefined,
          pricePerUnit: searchParams.get('price') ? Number(searchParams.get('price')) : undefined,
          notes: "",
          buyerId: buyerId || "",
          conversationId: searchParams.get('conversationId') || "",
        });

      } catch (error) {
        console.error("Error fetching data for offers page:", error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to load necessary data." });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, searchParams, form, toast]);

  const handleAction = async (values: z.infer<typeof offerSchema>) => {
    if (!firebaseUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to send an offer." });
      return;
    }
    
    startTransition(async () => {
        const idToken = await firebaseUser.getIdToken();
        const result = await createOfferServerAction(values, idToken);

        if (result.success) {
            toast({
                title: "Offer Sent",
                description: "Your formal offer has been sent to the buyer.",
            });
            router.push(`/messages/${values.conversationId}`);
        } else {
             toast({
                variant: "destructive",
                title: "Failed to Send Offer",
                description: result.error || "An unknown error occurred.",
            });
        }
    });
  }

  const selectedProductId = form.watch('productId');
  useEffect(() => {
      if (selectedProductId) {
          const product = sellerProducts.find(p => p.id === selectedProductId);
          if (product && !form.getValues('pricePerUnit')) {
              form.setValue('pricePerUnit', product.priceUSD);
          }
      }
  }, [selectedProductId, sellerProducts, form]);

  if (loading) {
      return (
         <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full max-w-lg" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-32" />
            </CardContent>
         </Card>
      )
  }

  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Create Formal Offer</CardTitle>
          <CardDescription>
            {buyer 
              ? `Fill out the details to send an offer to ${buyer.name}. ` 
              : "Fill out the details to send an offer. "}
            {form.getValues('conversationId') && (
              <Link href={`/messages/${form.getValues('conversationId')}`} className="text-primary hover:underline">
                Return to conversation.
              </Link>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(handleAction)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        name={field.name}
                        disabled={isSending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sellerProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? ''} disabled={isSending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pricePerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Unit (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value ?? ''} disabled={isSending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Bulk discount applied, delivery terms..."
                          {...field}
                          disabled={isSending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={isSending || !form.getValues('buyerId')}>
                    {isSending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Offer
                </Button>
              </form>
            </Form>
        </CardContent>
    </Card>
  );
}

export default function OffersPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OffersPageContent />
        </Suspense>
    )
}
