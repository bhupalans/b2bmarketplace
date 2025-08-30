
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

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
  const [isLoading, setIsLoading] = useState(false);

  const categorySchema = z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters.'),
    parentId: z.string().nullable(),
    status: z.enum(['active', 'inactive']),
    specTemplateId: z.string().optional(),
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
      specTemplateId: '',
    },
  });

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
            specTemplateId: category.specTemplateId || '',
          });
        }
        setIsLoading(false);
      } else {
        form.reset({ name: '', parentId: null, status: 'active', specTemplateId: '' });
      }
    };

    if (open) {
      fetchCategory();
    }
  }, [categoryId, open, form, allCategories]);

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsSaving(true);
    try {
      const savedCategory = await createOrUpdateCategoryClient(values, categoryId);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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

            <FormField
              control={form.control}
              name="specTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specification Template</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="">-- No Template --</SelectItem>
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


            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onOpenChange} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
