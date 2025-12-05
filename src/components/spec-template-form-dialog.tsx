
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { SpecTemplate, SpecTemplateField } from '@/lib/types';
import { createOrUpdateSpecTemplateClient } from '@/lib/firebase';
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
import { Loader2, Plus, Trash2, Settings, X } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

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

  const specFieldSchema = z.object({
      name: z.string().min(1, 'Field name cannot be empty.'),
      type: z.enum(['text', 'select', 'radio', 'switch', 'checkbox']),
      options: z.string().optional(),
    }).refine(data => {
        if ((data.type === 'select' || data.type === 'radio' || data.type === 'checkbox') && (!data.options || data.options.trim().length === 0)) {
            return false;
        }
        return true;
    }, {
        message: "Options are required for 'select', 'radio', and 'checkbox' types.",
        path: ['options']
    });

  const specTemplateSchema = z.object({
    name: z.string().min(3, 'Template name must be at least 3 characters.')
      .refine(name => !templateNameExists(name), 'This template name is already taken.'),
    fields: z.array(specFieldSchema).min(1, 'Please add at least one specification field.'),
  });

  const form = useForm<z.infer<typeof specTemplateSchema>>({
    resolver: zodResolver(specTemplateSchema),
    defaultValues: {
      name: '',
      fields: [{ name: '', type: 'text', options: '' }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
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
              fields: template.fields.map(f => ({ ...f, options: f.options?.join(',') || ''})),
            });
          }
        } catch (error) {
          console.error('Failed to fetch template:', error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load template data.' });
        } finally {
          setIsLoading(false);
        }
      } else {
        form.reset({ name: '', fields: [{ name: '', type: 'text', options: '' }] });
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
            fields: values.fields.map(f => {
                const fieldData: SpecTemplateField = {
                    name: f.name,
                    type: f.type,
                };
                if ((f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') && f.options) {
                    fieldData.options = f.options.split(',').map(opt => opt.trim()).filter(Boolean);
                }
                return fieldData;
            }),
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
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
                        name={`fields.${index}.name`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                            <FormControl>
                                <Input placeholder={`Field Name (e.g., Material)`} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Configure Field</h4>
                                        <p className="text-sm text-muted-foreground">
                                        Set the input type for this field.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`fields.${index}.type`}
                                            render={({ field: typeField }) => (
                                                <FormItem>
                                                    <FormLabel>Input Type</FormLabel>
                                                    <Select onValueChange={typeField.onChange} defaultValue={typeField.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select input type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="text">Text</SelectItem>
                                                            <SelectItem value="select">Select (Dropdown)</SelectItem>
                                                            <SelectItem value="radio">Radio Group</SelectItem>
                                                            <SelectItem value="switch">Switch (Toggle)</SelectItem>
                                                            <SelectItem value="checkbox">Checkbox Group</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        {(form.watch(`fields.${index}.type`) === 'select' || form.watch(`fields.${index}.type`) === 'radio' || form.watch(`fields.${index}.type`) === 'checkbox') && (
                                            <FormField
                                                control={form.control}
                                                name={`fields.${index}.options`}
                                                render={({ field: optionsField }) => (
                                                    <FormItem>
                                                        <FormLabel>Options</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="Enter comma-separated values, e.g., Red,Green,Blue" {...optionsField} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

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
                    onClick={() => append({ name: '', type: 'text', options: '' })}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                </Button>
                </div>

                <DialogFooter className="sticky bottom-0 bg-background py-4 -mx-6 px-6 border-t">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Template
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
