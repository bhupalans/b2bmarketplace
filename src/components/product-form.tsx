
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
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Product, Category, SpecTemplate, SpecTemplateField } from "@/lib/types";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { createOrUpdateProductClient, getProductClient } from "@/lib/firebase";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { countries } from "@/lib/geography-data";
import { useCurrency } from "@/contexts/currency-context";

const MAX_IMAGES = 5;

const productSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  priceUSD: z.coerce.number().positive({ message: "Price must be a positive number." }),
  categoryId: z.string().min(1, { message: "Please select a sub-category." }),
  countryOfOrigin: z.string().min(1, { message: "Please select a country of origin." }),
  stockAvailability: z.enum(['in_stock', 'out_of_stock', 'made_to_order'], { required_error: 'Please select stock availability.'}),
  moq: z.coerce.number().int().min(1, { message: "Minimum order quantity must be at least 1." }),
  moqUnit: z.string().min(1, { message: "Please specify a unit (e.g., pieces, kg)." }),
  sku: z.string().optional(),
  leadTime: z.string().optional(),
  specifications: z.array(z.object({
      name: z.string(),
      value: z.string().min(1, { message: "Specification value cannot be empty." }),
  })).optional(),
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
  specTemplates: SpecTemplate[];
};

const ProductFormDialogComponent = ({ open, onOpenChange, productId, onSuccess, categories, specTemplates }: ProductFormDialogProps) => {
  const { toast } = useToast();
  const [isSaving, startSavingTransition] = useTransition();
  const { firebaseUser } = useAuth();
  const { currency } = useCurrency();
  
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<SpecTemplate | null>(null);

  const [selectedParentCategory, setSelectedParentCategory] = useState<string | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      priceUSD: undefined,
      categoryId: "",
      countryOfOrigin: "",
      stockAvailability: 'in_stock',
      moq: 1,
      moqUnit: "pieces",
      sku: "",
      leadTime: "",
      specifications: [],
      existingImages: [],
      newImageFiles: undefined,
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "specifications"
  });
  
  const watchedNewImageFiles = useWatch({ control: form.control, name: 'newImageFiles' });
  const watchedExistingImages = useWatch({ control: form.control, name: 'existingImages' }) || [];
  const watchedCategoryId = useWatch({ control: form.control, name: 'categoryId' });

  useEffect(() => {
    if (categories && categories.length > 0) {
      setParentCategories(categories.filter(c => c.parentId === null));
    }
  }, [categories]);
  
  useEffect(() => {
    if (selectedParentCategory) {
        setSubCategories(categories.filter(c => c.parentId === selectedParentCategory));
    } else {
        setSubCategories([]);
    }
  }, [selectedParentCategory, categories]);


  useEffect(() => {
    if (watchedCategoryId) {
        const category = categories.find(c => c.id === watchedCategoryId);
        const templateId = category?.specTemplateId;
        const template = specTemplates.find(t => t.id === templateId) || null;
        setActiveTemplate(template);

        if (template) {
            const currentSpecs = form.getValues('specifications') || [];
            const newFields = template.fields.map(field => {
                const existingField = currentSpecs.find(s => s.name === field.name);
                let defaultValue = '';
                if (field.type === 'switch') {
                    defaultValue = 'false';
                }
                return { name: field.name, value: existingField?.value || defaultValue };
            });
            replace(newFields);
        } else {
            replace([]);
        }
    } else {
        replace([]);
        setActiveTemplate(null);
    }
  }, [watchedCategoryId, categories, specTemplates, replace, form]);

  const resetForm = useCallback(() => {
    form.reset({
      title: "",
      description: "",
      priceUSD: undefined,
      categoryId: "",
      countryOfOrigin: "",
      stockAvailability: 'in_stock',
      moq: 1,
      moqUnit: "pieces",
      sku: "",
      leadTime: "",
      specifications: [],
      existingImages: [],
      newImageFiles: undefined,
    });
    setNewImagePreviews([]);
    setActiveTemplate(null);
    setSelectedParentCategory(null);
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
                countryOfOrigin: fetchedProduct.countryOfOrigin,
                stockAvailability: fetchedProduct.stockAvailability,
                moq: fetchedProduct.moq,
                moqUnit: fetchedProduct.moqUnit,
                sku: fetchedProduct.sku || '',
                leadTime: fetchedProduct.leadTime || '',
                specifications: fetchedProduct.specifications || [],
                existingImages: fetchedProduct.images || [],
                newImageFiles: undefined,
            });
            const productCategory = categories.find(c => c.id === fetchedProduct.categoryId);
            if (productCategory && productCategory.parentId) {
                setSelectedParentCategory(productCategory.parentId);
            }
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
  }, [productId, open, form, toast, resetForm, onOpenChange, categories]);
  
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
      if (!firebaseUser || !firebaseUser.uid) {
        toast({ 
          variant: "destructive", 
          title: "Authentication Error", 
          description: "Your session may have expired. Please log out and sign back in." 
        });
        return;
      }
      
      const { newImageFiles, ...productData } = values;
      const filesToUpload = newImageFiles ? Array.from(newImageFiles) : [];

      try {
        const result = await createOrUpdateProductClient(
          productData,
          filesToUpload,
          firebaseUser.uid,
          productId
        );
        
        if (productId) {
            if (result.autoApproved) {
                 toast({
                    title: "Product Updated",
                    description: "Your changes were auto-approved and are now live.",
                });
            } else {
                 toast({
                    title: "Product Updated",
                    description: `Your changes to "${result.product.title}" have been submitted for review.`,
                });
            }
        } else {
             toast({
                title: "Product Submitted",
                description: `Your product "${result.product.title}" has been submitted for review.`,
            });
        }
        
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
  
  const handleParentCategoryChange = (value: string) => {
    setSelectedParentCategory(value);
    form.setValue('categoryId', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? "Edit Product" : "Create New Product"}</DialogTitle>
          <DialogDescription>
            {productId ? "Edit the details for your product listing." : "Fill out the details below. Your product will be submitted for admin review."}
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
            <div className="space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-medium">Core Details</h3>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Industrial Grade Widgets" {...field} value={field.value ?? ''} />
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
                      <Textarea placeholder="Describe your product in detail..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="priceUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per unit ({currency})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value ?? ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={handleParentCategoryChange} value={selectedParentCategory ?? ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parentCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub-category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={!selectedParentCategory}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </div>

            <div className="space-y-4 rounded-md border p-4">
              <h3 className="text-lg font-medium">Logistics & Inventory</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Model Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. WIDGET-001" {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <FormField
                      control={form.control}
                      name="moq"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Minimum Order</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="moqUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., kg" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="countryOfOrigin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country of Origin</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leadTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Time</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 5-7 business days" {...field} value={field.value ?? ''} />
                        </FormControl>
                         <FormDescription>Estimated time to ship the order.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
                <FormField
                    control={form.control}
                    name="stockAvailability"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Stock Availability</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4 pt-2"
                            >
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="in_stock" id="in_stock" /></FormControl>
                                <FormLabel htmlFor="in_stock" className="font-normal">In Stock</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="out_of_stock" id="out_of_stock" /></FormControl>
                                <FormLabel htmlFor="out_of_stock" className="font-normal">Out of Stock</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><RadioGroupItem value="made_to_order" id="made_to_order" /></FormControl>
                                <FormLabel htmlFor="made_to_order" className="font-normal">Made to Order</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            {activeTemplate && fields.length > 0 && (
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-lg font-medium">Technical Specifications ({activeTemplate.name})</h3>
                     <Separator />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTemplate.fields.map((specField, index) => (
                           <div key={specField.name}>
                                {specField.type === 'text' && (
                                    <FormField
                                        control={form.control}
                                        name={`specifications.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{specField.name}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={`Enter ${specField.name}`} {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {specField.type === 'select' && (
                                    <FormField
                                        control={form.control}
                                        name={`specifications.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{specField.name}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={`Select ${specField.name}`} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {specField.options?.map(option => (
                                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {specField.type === 'radio' && (
                                    <FormField
                                        control={form.control}
                                        name={`specifications.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>{specField.name}</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex flex-wrap gap-x-4 gap-y-2"
                                                    >
                                                        {specField.options?.map(option => (
                                                            <FormItem key={option} className="flex items-center space-x-2">
                                                                <FormControl>
                                                                    <RadioGroupItem value={option} id={`${specField.name}-${option}`} />
                                                                </FormControl>
                                                                <FormLabel htmlFor={`${specField.name}-${option}`} className="font-normal">{option}</FormLabel>
                                                            </FormItem>
                                                        ))}
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {specField.type === 'switch' && (
                                     <FormField
                                        control={form.control}
                                        name={`specifications.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 h-full">
                                                <div className="space-y-0.5">
                                                    <FormLabel>{specField.name}</FormLabel>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value === 'true'}
                                                        onCheckedChange={(checked) => field.onChange(String(checked))}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {specField.type === 'checkbox' && (
                                    <FormField
                                        control={form.control}
                                        name={`specifications.${index}.value`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel>{specField.name}</FormLabel>
                                                </div>
                                                <div className="flex flex-row items-center gap-x-6 gap-y-2 flex-wrap">
                                                    {specField.options?.map(option => (
                                                        <FormField
                                                            key={option}
                                                            control={form.control}
                                                            name={`specifications.${index}.value`}
                                                            render={({ field }) => {
                                                                const currentValues = field.value ? field.value.split(', ') : [];
                                                                return (
                                                                    <FormItem
                                                                        key={option}
                                                                        className="flex flex-row items-start space-x-2 space-y-0"
                                                                    >
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={currentValues.includes(option)}
                                                                                onCheckedChange={(checked) => {
                                                                                    const updatedValues = checked
                                                                                        ? [...currentValues, option]
                                                                                        : currentValues.filter((value) => value !== option);
                                                                                    return field.onChange(updatedValues.join(', '));
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal">{option}</FormLabel>
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
                                )}
                           </div>
                        ))}
                    </div>
                </div>
            )}


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
                                disabled={isSaving || !firebaseUser}
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
              <Button type="submit" disabled={isSaving || !firebaseUser}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {productId ? "Submit for Review" : "Submit for Review"}
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
