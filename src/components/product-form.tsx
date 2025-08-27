
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
import { Loader2, Trash2, Plus, UploadCloud } from "lucide-react";
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
import { useAuth } from "@/contexts/auth-context";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { Progress } from "./ui/progress";


const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  images: z.array(z.string().url({ message: "Please enter a valid URL."})).min(1, { message: "Please add at least one image." }),
  sellerId: z.string(),
});


type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  onSuccess: (product: Product) => void;
};

const storage = getStorage();

async function uploadImage(file: File, onProgress: (progress: number) => void): Promise<string> {
  const fileId = uuidv4();
  const storageRef = ref(storage, `product-images/${fileId}-${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
}


export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: ProductFormDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id,
      title: product?.title || "",
      description: product?.description || "",
      priceUSD: product?.priceUSD || '',
      categoryId: product?.categoryId || "",
      images: product?.images || [],
    },
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (user?.id) {
      form.setValue('sellerId', user.id);
    }
    form.reset({
      id: product?.id,
      title: product?.title || "",
      description: product?.description || "",
      priceUSD: product?.priceUSD || '',
      categoryId: product?.categoryId || "",
      images: product?.images || [],
      sellerId: user?.id || "",
    });
  }, [product, open, form, user]);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    const uploadPromises = Array.from(files).map(file => {
        const uniqueId = uuidv4();
        return uploadImage(file, (progress) => {
            setUploadProgress(prev => ({ ...prev, [uniqueId]: progress }));
        }).then(downloadURL => {
            // Remove progress for completed file
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[uniqueId];
                return newProgress;
            });
            return downloadURL;
        });
    });

    try {
        const downloadURLs = await Promise.all(uploadPromises);
        const currentImages = form.getValues("images");
        form.setValue("images", [...currentImages, ...downloadURLs]);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "There was a problem uploading your image(s). Please try again.",
        });
    } finally {
        setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues("images");
    form.setValue("images", currentImages.filter((_, i) => i !== index));
  }
  
  const totalProgress = Object.values(uploadProgress).length > 0
    ? Object.values(uploadProgress).reduce((a, b) => a + b, 0) / Object.values(uploadProgress).length
    : 0;

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
            <input type="hidden" {...form.register("sellerId")} />
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
                  <FormControl>
                     <div className="flex flex-wrap items-center gap-4">
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
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif"
                            disabled={uploading}
                            multiple
                        />
                         <div className="flex items-center justify-center h-24 w-24 flex-shrink-0 border-2 border-dashed rounded-md">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-full w-full"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <UploadCloud className="h-6 w-6" />
                                )}
                                <span className="sr-only">Upload Image</span>
                            </Button>
                        </div>
                    </div>
                  </FormControl>
                  {uploading && <Progress value={totalProgress} className="w-full mt-2" />}
                  <FormDescription>The first image will be the main display image. You can upload multiple images.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || uploading}>
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
