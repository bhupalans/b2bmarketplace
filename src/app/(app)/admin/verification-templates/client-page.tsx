
"use client";

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { VerificationTemplate } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { VerificationTemplateFormDialog } from '@/components/verification-template-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteVerificationTemplateClient } from '@/lib/firebase';
import { countries } from '@/lib/geography-data';

interface VerificationTemplatesClientPageProps {
  initialTemplates: VerificationTemplate[];
}

export function VerificationTemplatesClientPage({ initialTemplates }: VerificationTemplatesClientPageProps) {
  const [templates, setTemplates] = useState<VerificationTemplate[]>(initialTemplates);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<VerificationTemplate | null>(null);
  const { toast } = useToast();

  const handleCreate = useCallback(() => {
    setSelectedTemplateId(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setFormOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setFormOpen(false);
      setSelectedTemplateId(null);
    }
  }, []);

  const handleFormSuccess = useCallback((savedTemplate: VerificationTemplate) => {
    setTemplates(prev => {
        const index = prev.findIndex(t => t.id === savedTemplate.id);
        if (index > -1) {
            const newTemplates = [...prev];
            newTemplates[index] = savedTemplate;
            return newTemplates;
        }
        return [...prev, savedTemplate];
    });
    setFormOpen(false);
    setSelectedTemplateId(null);
  }, []);

  const handleDeleteInitiate = (template: VerificationTemplate) => {
    setTemplateToDelete(template);
  };
  
  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    try {
      await deleteVerificationTemplateClient(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      toast({
        title: 'Template Deleted',
        description: `The template for "${templateToDelete.countryName}" has been successfully removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Template',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setTemplateToDelete(null);
    }
  };
  
  const getCountryLabel = (code: string) => {
      return countries.find(c => c.value === code)?.label || code;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Verification Templates</h1>
            <p className="text-muted-foreground">Manage country-specific verification forms for sellers.</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2" />
            Create Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Template List</CardTitle>
            <CardDescription>
              You have {templates.length} template(s) defined for different countries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Required Fields</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{getCountryLabel(template.id)} ({template.id})</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {template.fields.map(field => (
                                <Badge key={field.name} variant="secondary">{field.label}</Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(template.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500 hover:text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteInitiate(template)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No verification templates found. Get started by creating one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <VerificationTemplateFormDialog
        key={selectedTemplateId || 'new'}
        open={isFormOpen}
        onOpenChange={handleDialogClose}
        templateId={selectedTemplateId}
        onSuccess={handleFormSuccess}
        allTemplates={templates}
      />

      <DeleteConfirmationDialog
        open={!!templateToDelete}
        onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemType="verification template"
        itemName={templateToDelete?.countryName}
      />
    </>
  );
}
