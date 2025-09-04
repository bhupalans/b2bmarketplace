
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { VerificationTemplate, VerificationField } from '@/lib/types';
import { createOrUpdateVerificationTemplateClient } from '@/lib/firebase';
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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { countries } from '@/lib/geography-data';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';

interface VerificationTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string | null;
  onSuccess: (template: VerificationTemplate) => void;
  allTemplates: VerificationTemplate[];
}

export function VerificationTemplateFormDialog({ open, onOpenChange, templateId, onSuccess, allTemplates }: VerificationTemplateFormDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const idIsUnique = (id: string) => {
    return !allTemplates.some(t => t.id === id && t.id !== templateId);
  }

  const verificationFieldSchema = z.object({
      name: z.string().min(1, 'Field name cannot be empty.'),
      label: z.string().min(1, 'Label cannot be empty.'),
      type: z.enum(['text', 'file']),
      required: z.boolean(),
      validationRegex: z.string().optional(),
      helperText: z.string().optional(),
    });

  const verificationTemplateSchema = z.object({
    id: z.string().min(2, 'Country code must be at least 2 characters.').refine(idIsUnique, 'This country code is already in use.'),
    fields: z.array(verificationFieldSchema).min(1, 'Please add at least one verification field.'),
  });

  const form = useForm<z.infer<typeof verificationTemplateSchema>>({
    resolver: zodResolver(verificationTemplateSchema),
    defaultValues: {
      id: '',
      fields: [{ name: '', label: '', type: 'text', required: true, validationRegex: '', helperText: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  useEffect(() => {
    const fetchTemplate = () => {
      if (templateId) {
        setIsLoading(true);
        const template = allTemplates.find(t => t.id === templateId);
        if (template) {
          form.reset({
            id: template.id,
            fields: template.fields.map(f => ({ ...f, validationRegex: f.validationRegex || '', helperText: f.helperText || ''})),
          });
        }
        setIsLoading(false);
      } else {
        form.reset({ id: '', fields: [{ name: '', label: '', type: 'text', required: true, validationRegex: '', helperText: '' }] });
      }
    };

    if (open) {
      fetchTemplate();
    }
  }, [templateId, open, form, allTemplates]);
  
  const watchedCountry = useWatch({ control: form.control, name: 'id' });

  const onSubmit = async (values: z.infer<typeof verificationTemplateSchema>) => {
    setIsSaving(true);
    try {
        const countryName = countries.find(c => c.value === values.id)?.label || values.id;
        const templateData = {
            countryName,
            fields: values.fields.map(f => ({
                ...f,
                validationRegex: f.validationRegex || undefined,
                helperText: f.helperText || undefined,
            }))
        };

      const savedTemplate = await createOrUpdateVerificationTemplateClient(templateData, values.id);
      toast({
        title: templateId ? 'Template Updated' : 'Template Created',
        description: `The template for "${countryName}" has been saved.`,
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{templateId ? 'Edit Verification Template' : 'Create New Verification Template'}</DialogTitle>
          <DialogDescription>
            Define the required fields for seller verification in a specific country.
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
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!templateId}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a country" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {countries.map(country => (
                              <SelectItem key={country.value} value={country.value} disabled={allTemplates.some(t => t.id === country.value && t.id !== templateId)}>
                                  {country.label}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <FormDescription>The 2-letter country code will be used as the template ID. Cannot be changed after creation.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Verification Fields</FormLabel>
              <div className="mt-2 space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3 rounded-md border p-4">
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                          control={form.control}
                          name={`fields.${index}.label`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Label</FormLabel>
                              <FormControl><Input placeholder="e.g., GSTN Number" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`fields.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Field Name (Key)</FormLabel>
                              <FormControl><Input placeholder="e.g., gstn" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`fields.${index}.helperText`}
                          render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                              <FormLabel>Helper Text</FormLabel>
                              <FormControl><Textarea placeholder="Short description shown below the field" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`fields.${index}.validationRegex`}
                          render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                              <FormLabel>Validation Regex (Optional)</FormLabel>
                              <FormControl><Input placeholder="e.g., ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-center gap-4">
                            <FormField
                            control={form.control}
                            name={`fields.${index}.required`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-2 space-y-0 rounded-md p-2 border">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Required</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                            />
                        </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="mt-1"
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
                className="mt-4"
                onClick={() => append({ name: '', label: '', type: 'text', required: true, validationRegex: '', helperText: '' })}
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
