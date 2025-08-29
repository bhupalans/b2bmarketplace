
"use client";

import React, { memo, useEffect, useState, useTransition, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Product, Category } from "@/lib/types";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { createOrUpdateProductClient, getProductClient } from "@/lib/firebase";
import { Skeleton } from "./ui/skeleton";

const MAX_IMAGES = 5;

const productSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  existingImages: z.array(z.string().url()).optional(),
  newImageFiles: z.instanceof(FileList).optional(),
}).refine(data => {
    const existingCount = data.existingImages?.length || 0;
    const newCount = data.newImageFiles?.length || 0;
    return (existingCount + newCount) > 0;
}, {
    message: "Please add at least one image.",
    path: ["newImageFiles"], 
}).refine(data => {
    const existingCount = data.existingImages?.length || 0;
    const newCount = data.newImageFiles?.length || 0;
    return (existingCount + newCount) <= MAX_IMAGES;
}, {
    message: `You can upload a maximum of ${MAX_IMAGES} images.`,
    path: ["newImageFiles"],
});

type ProductFormData = z.infer<typeof productSchema>;

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
  onSuccess: () => void;
  categories: Category[];
};

const ProductFormDialogComponent = ({ open, onOpenChange, productId, onSuccess, categories }: ProductFormDialogProps) => {
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const { firebaseUser } = useAuth();
  
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      priceUSD: undefined,
      categoryId: "",
      existingImages: [],
      newImageFiles: undefined,
    },
  });
  
  const watchedNewImageFiles = useWatch({ control: form.control, name: 'newImageFiles' });
  const watchedExistingImages = useWatch({ control: form.control, name: 'existingImages' }) || [];

  const resetForm = useCallback(() => {
    form.reset({
      title: "",
      description: "",
      priceUSD: undefined,
      categoryId: "",
      existingImages: [],
      newImageFiles: undefined,
    });
    setNewImagePreviews([]);
  }, [form]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (productId) {
        setIsLoadingProduct(true);
        try {
          const fetchedProduct = await getProductClient(productId);
          if (fetchedProduct) {
            form.reset({
                title: fetchedProduct.title,
                description: fetchedProduct.description,
                priceUSD: fetchedProduct.priceUSD,
                categoryId: fetchedProduct.categoryId,
                existingImages: fetchedProduct.images || [],
                newImageFiles: undefined,
            });
          }
        } catch (error) {
          console.error("Failed to fetch product", error);
          toast({ variant: 'destructive', title: "Error", description: "Failed to load product data."})
          onOpenChange(false);
        } finally {
          setIsLoadingProduct(false);
        }
      } else {
        resetForm();
      }
    }

    if (open) {
      fetchProduct();
    } else {
      resetForm();
    }
  }, [productId, open, form, toast, resetForm, onOpenChange]);
  
  useEffect(() => {
    if (watchedNewImageFiles && watchedNewImageFiles.length > 0) {
        const objectUrls = Array.from(watchedNewImageFiles).map(file => URL.createObjectURL(file));
        setNewImagePreviews(objectUrls);

        return () => {
            objectUrls.forEach(URL.revokeObjectURL);
        }
    } else {
        setNewImagePreviews([]);
    }
  }, [watchedNewImageFiles]);
  
  const onSubmit = (values: ProductFormData) => {
    startSavingTransition(async () => {
      if (!firebaseUser) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
      }
      
      const { newImageFiles, ...productData } = values;
      const filesToUpload = newImageFiles ? Array.from(newImageFiles) : [];

      try {
        const savedProduct = await createOrUpdateProductClient(
          productData,
          filesToUpload,
          firebaseUser.uid,
          productId
        );
        
        toast({
            title: productId ? "Product Updated" : "Product Submitted",
            description: productId 
                ? `Your changes to "${savedProduct.title}" have been submitted for review.`
                : `Your product "${savedProduct.title}" has been submitted for review.`,
        });
        onSuccess();
      } catch (error: any) {
         toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error.message || "An unexpected error occurred. Please check the console and try again.",
        });
      }
    });
  };

  const handleRemoveExistingImage = (imageUrlToRemove: string) => {
    const currentImages = form.getValues("existingImages") || [];
    form.setValue("existingImages", currentImages.filter((img) => img !== imageUrlToRemove), { shouldValidate: true, shouldDirty: true });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? "Edit Product" : "Create New Product"}</DialogTitle>
          <DialogDescription>
            {productId ? "Edit the details for your product listing. Your changes will be sent for re-approval." : "Fill out the details below. Your product will be submitted for admin review."}
          </DialogDescription>
        </DialogHeader>
        {isLoadingProduct ? (
            <div className="space-y-6 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-24 w-full" />
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Industrial Grade Widgets" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your product in detail..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceUSD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''}/>
                    </FormControl>
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
                          <SelectValue placeholder="Select a category" />
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
            </div>
            
            <FormField
                control={form.control}
                name="newImageFiles"
                render={({ field: { onChange, ...fieldProps } }) => (
                 <FormItem>
                  <FormLabel>Product Images</FormLabel>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {watchedExistingImages.map((img) => (
                        <div key={img} className="relative group aspect-square">
                            <Image src={img} alt="Existing product image" fill className="rounded-md object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => handleRemoveExistingImage(img)}
                                disabled={isSaving}
                            >
                                <Trash2 className="h-4 w-4"/>
                                <span className="sr-only">Delete Image</span>
                            </Button>
                        </div>
                    ))}
                    {newImagePreviews.map((preview) => (
                        <div key={preview} className="relative group aspect-square">
                            <Image src={preview} alt="New product image preview" fill className="rounded-md object-cover" />
                        </div>
                    ))}

                    <div className="flex items-center justify-center h-full w-full aspect-square flex-shrink-0 border-2 border-dashed rounded-md">
                        <label htmlFor="product-images-input" className="cursor-pointer h-full w-full flex flex-col items-center justify-center text-muted-foreground hover:text-primary">
                            {isSaving ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                           ) : (
                                <UploadCloud className="h-6 w-6" />
                           )}
                           <span className="sr-only">Upload Image</span>
                        </label>
                        <FormControl>
                             <input
                                id="product-images-input"
                                type="file"
                                className="hidden"
                                accept="image/png, image/jpeg, image/gif"
                                disabled={isSaving}
                                multiple
                                {...fieldProps}
                                value={undefined}
                                onChange={(event) => {
                                  onChange(event.target.files)
                                }}
                            />
                        </FormControl>
                    </div>
                  </div>
                  <FormDescription>The first image will be the main display image. You can upload up to {MAX_IMAGES} images.</FormDescription>
                    <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for Review
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const ProductFormDialog = memo(ProductFormDialogComponent);
