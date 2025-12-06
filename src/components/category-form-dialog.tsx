
"use client";

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Category, SpecTemplate } from '@/lib/types';
import { createOrUpdateCategoryClient } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import Link from 'next/link';
import Image from 'next/image';
import { generateImage } from '@/ai/flows/generate-image-flow';
import { Separator } from './ui/separator';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: () => void;
  categoryId?: string | null;
  onSuccess: (category: Category) => void;
  allCategories: Category[];
  specTemplates: SpecTemplate[];
}

const categoryNameExists = (name: string, parentId: string | null, allCategories: Category[], currentId?: string | null) => {
    return allCategories.some(c => 
        c.name.toLowerCase() === name.toLowerCase() && 
        c.parentId === parentId &&
        c.id !== currentId
    );
}

export function CategoryFormDialog({ open, onOpenChange, categoryId, onSuccess, allCategories, specTemplates }: CategoryFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, startImageGeneration] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categorySchema = z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters.'),
    parentId: z.string().nullable(),
    status: z.enum(['active', 'inactive']),
    specTemplateId: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
  }).refine(data => {
    return !categoryNameExists(data.name, data.parentId, allCategories, categoryId);
  }, {
    message: 'A category with this name already exists at this level.',
    path: ['name'],
  });

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      parentId: null,
      status: 'active',
      specTemplateId: null,
      imageUrl: null,
    },
  });
  
  const watchedName = useWatch({ control: form.control, name: 'name' });

  useEffect(() => {
    const fetchCategory = () => {
      if (categoryId) {
        setIsLoading(true);
        const category = allCategories.find(c => c.id === categoryId);
        if (category) {
          form.reset({
            name: category.name,
            parentId: category.parentId,
            status: category.status,
            specTemplateId: category.specTemplateId || null,
            imageUrl: category.imageUrl || null,
          });
          setPreviewImageUrl(category.imageUrl || null);
        }
        setIsLoading(false);
      } else {
        form.reset({ name: '', parentId: null, status: 'active', specTemplateId: null, imageUrl: null });
        setPreviewImageUrl(null);
      }
    };

    if (open) {
      fetchCategory();
    }
  }, [categoryId, open, form, allCategories]);

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...values,
        imageUrl: previewImageUrl, // Use the state which holds the generated image
        specTemplateId: values.specTemplateId || null,
      };

      const savedCategory = await createOrUpdateCategoryClient(dataToSave, categoryId);
      toast({
        title: categoryId ? 'Category Updated' : 'Category Created',
        description: `The category "${savedCategory.name}" has been saved.`,
      });
      onSuccess(savedCategory);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateImage = () => {
    if (!watchedName) {
        toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter a category name first.'});
        return;
    }

    startImageGeneration(async () => {
        try {
            const result = await generateImage({ prompt: `Professional, clean product photography representing the category: ${watchedName}. White background.` });
            setPreviewImageUrl(result.imageUrl);
            toast({ title: 'Image Generated!', description: 'A new image has been created for your category.' });
        } catch (error) {
            console.error("AI image generation failed:", error);
            toast({ variant: 'destructive', title: 'Image Generation Failed', description: 'Could not generate an image. Please try again.' });
        }
    });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{categoryId ? 'Edit Category' : 'Create New Category'}</DialogTitle>
          <DialogDescription>
            Manage your product categories and their properties.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Mechanical Components" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'null' ? null : value)} value={field.value ?? 'null'}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a parent category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="null">-- No Parent (Root Category) --</SelectItem>
                        {allCategories.filter(c => c.id !== categoryId).map((c) => ( // Prevent self-parenting
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <Separator />
                <div className="space-y-2">
                    <FormLabel>Category Image</FormLabel>
                    <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden border">
                        {previewImageUrl ? (
                            <Image src={previewImageUrl} alt={watchedName || 'Category Image'} fill className="object-cover"/>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                No Image
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Browse...
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                        />
                        <Button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage || !watchedName}>
                            {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                            {isGeneratingImage ? 'Generating...' : 'AI Generate Image'}
                        </Button>
                    </div>
                    <FormDescription>
                        Upload a custom image or use AI to generate one based on the category name.
                    </FormDescription>
                </div>
                <Separator />

                <FormField
                control={form.control}
                name="specTemplateId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Specification Template</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'null' ? null : value)} value={field.value ?? 'null'}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a template (optional)" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="null">-- No Template --</SelectItem>
                            {specTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>
                        Assign a set of required specifications for products in this category.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                        >
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                            <RadioGroupItem value="active" id="status-active" />
                            </FormControl>
                            <FormLabel htmlFor="status-active" className="font-normal">Active</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                            <FormControl>
                            <RadioGroupItem value="inactive" id="status-inactive" />
                            </FormControl>
                            <FormLabel htmlFor="status-inactive" className="font-normal">Inactive</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />


                <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                <Button type="button" variant="ghost" onClick={onOpenChange} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Category
                </Button>
                </DialogFooter>
            </form>
            </Form>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
