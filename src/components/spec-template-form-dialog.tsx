
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SpecTemplate } from '@/lib/types';
import { getSpecTemplatesClient, createOrUpdateSpecTemplateClient } from '@/lib/firebase';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface SpecTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string | null;
  onSuccess: (template: SpecTemplate) => void;
  allTemplates: SpecTemplate[];
}

export function SpecTemplateFormDialog({ open, onOpenChange, templateId, onSuccess, allTemplates }: SpecTemplateFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const templateNameExists = (name: string) => {
    return allTemplates.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== templateId);
  }

  const specTemplateSchema = z.object({
    name: z.string().min(3, 'Template name must be at least 3 characters.')
      .refine(name => !templateNameExists(name), 'This template name is already taken.'),
    fields: z.array(z.object({
      value: z.string().min(1, 'Field name cannot be empty.'),
    })).min(1, 'Please add at least one specification field.'),
  });

  const form = useForm<z.infer<typeof specTemplateSchema>>({
    resolver: zodResolver(specTemplateSchema),
    defaultValues: {
      name: '',
      fields: [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      if (templateId) {
        setIsLoading(true);
        try {
          const template = allTemplates.find(t => t.id === templateId);
          if (template) {
            form.reset({
              name: template.name,
              fields: template.fields.map(f => ({ value: f })),
            });
          }
        } catch (error) {
          console.error('Failed to fetch template:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load template data.' });
        } finally {
          setIsLoading(false);
        }
      } else {
        form.reset({ name: '', fields: [{ value: '' }] });
      }
    };

    if (open) {
      fetchTemplate();
    }
  }, [templateId, open, form, allTemplates, toast]);

  const onSubmit = async (values: z.infer<typeof specTemplateSchema>) => {
    setIsSaving(true);
    try {
      const templateData = {
        name: values.name,
        fields: values.fields.map(f => f.value),
      };
      const savedTemplate = await createOrUpdateSpecTemplateClient(templateData, templateId);
      toast({
        title: templateId ? 'Template Updated' : 'Template Created',
        description: `The template "${savedTemplate.name}" has been saved.`,
      });
      onSuccess(savedTemplate);
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
          <DialogTitle>{templateId ? 'Edit Template' : 'Create New Template'}</DialogTitle>
          <DialogDescription>
            Define a reusable set of specification fields for a product category.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
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
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard Widget Specs" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Specification Fields</FormLabel>
              <div className="mt-2 space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder={`Field ${index + 1} (e.g., Material)`} {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove field</span>
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => append({ value: '' })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
