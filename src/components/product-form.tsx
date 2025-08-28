
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
import { createOrUpdateProductAction, getSignedUploadUrlAction } from "@/app/actions";
import { getCategories } from "@/lib/firestore";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { v4 as uuidv4 } from "uuid";

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  images: z.array(z.string().url({ message: "Please enter a valid URL."})).min(1, { message: "Please add at least one image." }),
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id,
      title: product?.title || "",
      description: product?.description || "",
      priceUSD: product?.priceUSD || undefined,
      categoryId: product?.categoryId || "",
      images: product?.images || [],
    },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    form.reset({
      id: product?.id,
      title: product?.title || "",
      description: product?.description || "",
      priceUSD: product?.priceUSD || undefined,
      categoryId: product?.categoryId || "",
      images: product?.images || [],
    });
  }, [product, open, form]);

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    startSavingTransition(async () => {
      const result = await createOrUpdateProductAction(values);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;
    
    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async file => {
        // 1. Get a signed URL from the server
        const { success, error, url, finalFilePath } = await getSignedUploadUrlAction(file.name, file.type);
        
        if (!success || !url) {
          throw new Error(error || 'Could not get an upload URL.');
        }

        // 2. Upload the file to the signed URL
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        // 3. Construct the final public URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/b2b-marketplace-udg1v.appspot.com/o/${encodeURIComponent(finalFilePath!)}?alt=media`;
        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);

      const currentImages = form.getValues("images");
      form.setValue("images", [...currentImages, ...urls], { shouldValidate: true });
      toast({
        title: "Upload Successful",
        description: `${urls.length} image(s) have been added.`
      });

    } catch (error: any) {
        console.error("Upload failed in component:", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error.message || "Could not upload files.",
        });
    } finally {
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageUrlToRemove: string) => {
    const currentImages = form.getValues("images");
    form.setValue("images", currentImages.filter((img) => img !== imageUrlToRemove), { shouldValidate: true });
  };
  
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
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Images</FormLabel>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {field.value.map((img, index) => (
                        <div key={index} className="relative group aspect-square">
                            <Image src={img} alt="Product image" fill className="rounded-md object-cover" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => handleRemoveImage(img)}
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
                            disabled={isUploading}
                            multiple
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-full"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                           {isUploading ? (
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
              <Button type="submit" disabled={isSaving || isUploading}>
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
