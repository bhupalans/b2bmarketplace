
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
import { Loader2, Upload } from "lucide-react";
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
import { getCategories } from "@/lib/firestore";
import Image from "next/image";

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  images: z.array(z.string()).min(1, { message: "Please upload at least one image." }),
});

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: (product: Product) => void;
};

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: ProductFormDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);

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
    // Reset form when product prop changes
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
    startTransition(async () => {
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

  const handleImageUpload = () => {
    // In a real app, this would open a file picker and upload to cloud storage.
    // For this demo, we'll just add a placeholder image URL.
    const newImage = `https://picsum.photos/600/400?random=${Math.random()}`;
    const currentImages = form.getValues("images");
    form.setValue("images", [...currentImages, newImage]);
  }

  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues("images");
    form.setValue("images", currentImages.filter((_, i) => i !== index));
  }

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
                      <Input type="number" step="0.01" {...field} />
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
                  <FormControl>
                    <div className="flex items-center gap-4">
                        {field.value.map((img, index) => (
                            <div key={index} className="relative group">
                                <Image src={img} alt="Product image" width={100} height={100} className="rounded-md object-cover aspect-square" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="icon" className="h-24 w-24 flex-shrink-0" onClick={handleImageUpload}>
                            <Upload className="h-6 w-6"/>
                        </Button>
                    </div>
                  </FormControl>
                  <FormDescription>The first image will be the main display image.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
