
"use client";

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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Product, Category } from "@/lib/types";
import { createOrUpdateProductAction } from "@/app/actions";
import { getCategoriesClient } from "@/lib/firebase";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  existingImages: z.array(z.string().url()).optional(),
  newImageFiles: z.any().optional(), // We'll use a refine for this
}).refine(data => {
    const hasExistingImages = data.existingImages && data.existingImages.length > 0;
    const hasNewImages = data.newImageFiles && data.newImageFiles.length > 0;
    return hasExistingImages || hasNewImages;
}, {
    message: "Please add at least one image.",
    path: ["newImageFiles"], // Attach error to a field for display
});


type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: (product: Product) => void;
};

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: ProductFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);
  const { firebaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id,
      title: product?.title || "",
      description: product?.description || "",
      priceUSD: product?.priceUSD || undefined,
      categoryId: product?.categoryId || "",
      existingImages: product?.images || [],
    },
  });

  useEffect(() => {
    getCategoriesClient().then(setCategories);
  }, []);

  useEffect(() => {
    // Reset form and local file state when dialog opens or product changes
    if (open) {
      form.reset({
        id: product?.id,
        title: product?.title || "",
        description: product?.description || "",
        priceUSD: product?.priceUSD || undefined,
        categoryId: product?.categoryId || "",
        existingImages: product?.images || [],
        newImageFiles: [],
      });
      setNewImageFiles([]);
      setImagePreviews([]);
    }
  }, [product, open, form]);

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    startSavingTransition(async () => {
      if (!firebaseUser) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
      }
      
      const formData = new FormData();

      // Append text data
      if (values.id) formData.append('id', values.id);
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('priceUSD', values.priceUSD.toString());
      formData.append('categoryId', values.categoryId);

      // Append existing image URLs
      (values.existingImages || []).forEach(img => formData.append('existingImages[]', img));
      
      // Append new image files
      newImageFiles.forEach(file => formData.append('newImages', file));
      
      // Append auth token
      const idToken = await firebaseUser.getIdToken();
      formData.append('idToken', idToken);
      
      const result = await createOrUpdateProductAction(formData);

      if (result.success && result.product) {
        toast({
          title: product ? "Product Updated" : "Product Created",
          description: `The product "${result.product.title}" has been saved.`,
        });
        onSuccess(result.product);
      } else {
        toast({
          variant: "destructive",
          title: "An error occurred",
          description: result.error || "Something went wrong.",
        });
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const selectedFiles = Array.from(files);
    const newFiles = [...newImageFiles, ...selectedFiles];
    setNewImageFiles(newFiles);

    const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previewUrls]);
    
    form.setValue('newImageFiles' as any, newFiles, { shouldValidate: true });

    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingImage = (imageUrlToRemove: string) => {
    const currentImages = form.getValues("existingImages") || [];
    form.setValue("existingImages", currentImages.filter((img) => img !== imageUrlToRemove), { shouldValidate: true });
  };



  const handleRemoveNewImage = (indexToRemove: number) => {
    const newFiles = newImageFiles.filter((_, index) => index !== indexToRemove);
    setNewImageFiles(newFiles);

    const newPreviews = imagePreviews.filter((_, index) => index !== indexToRemove);
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setImagePreviews(newPreviews);
    
    form.setValue('newImageFiles' as any, newFiles, { shouldValidate: true });
  }

  const existingImages = form.watch('existingImages') || [];
  const totalImageCount = existingImages.length + newImageFiles.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Create New Product"}</DialogTitle>
          <DialogDescription>
            Fill out the details below for your product listing.
          </DialogDescription>
        </DialogHeader>
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
                render={({ field }) => (
                 <FormItem>
                  <FormLabel>Product Images</FormLabel>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {existingImages.map((img) => (
                        <div key={img} className="relative group aspect-square">
                            <Image src={img} alt="Product image" fill className="rounded-md object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => handleRemoveExistingImage(img)}
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}
                    {imagePreviews.map((preview, index) => (
                        <div key={preview} className="relative group aspect-square">
                            <Image src={preview} alt="New product image" fill className="rounded-md object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => handleRemoveNewImage(index)}
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}

                    <div className="flex items-center justify-center h-full w-full aspect-square flex-shrink-0 border-2 border-dashed rounded-md">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif"
                            disabled={isSaving}
                            multiple
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSaving}
                        >
                           {isSaving ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                           ) : (
                                <UploadCloud className="h-6 w-6" />
                           )}
                           <span className="sr-only">Upload Image</span>
                        </Button>
                    </div>
                  </div>
                  <FormDescription>The first image will be the main display image. You can upload multiple images.</FormDescription>
                    <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
