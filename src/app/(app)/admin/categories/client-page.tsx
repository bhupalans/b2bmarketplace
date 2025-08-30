
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2, ChevronsUpDown, ChevronRight } from "lucide-react";
import { Category, SpecTemplate } from '@/lib/types';
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
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteCategoryClient } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CategoriesClientPageProps {
  initialCategories: Category[];
  specTemplates: SpecTemplate[];
}

interface CategoryTreeItem extends Category {
  children: CategoryTreeItem[];
}

const buildCategoryTree = (categories: Category[]): CategoryTreeItem[] => {
  const categoryMap: { [key: string]: CategoryTreeItem } = {};
  categories.forEach((cat) => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });

  const tree: CategoryTreeItem[] = [];
  categories.forEach((cat) => {
    if (cat.parentId && categoryMap[cat.parentId]) {
      categoryMap[cat.parentId].children.push(categoryMap[cat.id]);
    } else {
      tree.push(categoryMap[cat.id]);
    }
  });

  // Sort children alphabetically
  Object.values(categoryMap).forEach(cat => {
    cat.children.sort((a, b) => a.name.localeCompare(b.name));
  });
  // Sort root level alphabetically
  tree.sort((a, b) => a.name.localeCompare(b.name));

  return tree;
};


const CategoryRow: React.FC<{ 
  category: CategoryTreeItem; 
  level: number; 
  onEdit: (categoryId: string) => void;
  onDelete: (category: Category) => void;
  getTemplateName: (templateId?: string) => string;
}> = ({ category, level, onEdit, onDelete, getTemplateName }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
        <>
            <TableRow className={cn(level > 0 && "bg-muted/30")}>
                <TableCell style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                    <div className="flex items-center gap-2">
                         {category.children.length > 0 && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                                </Button>
                            </CollapsibleTrigger>
                        )}
                        <span className={cn(category.children.length === 0 && "ml-8")}>{category.name}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant={category.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {category.status}
                    </Badge>
                </TableCell>
                <TableCell>{getTemplateName(category.specTemplateId)}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(category.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                        className="text-red-500 hover:text-red-600 focus:text-red-600"
                        onClick={() => onDelete(category)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
            <CollapsibleContent asChild>
                <>
                {category.children.map(child => (
                    <CategoryRow 
                        key={child.id} 
                        category={child} 
                        level={level + 1}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        getTemplateName={getTemplateName}
                    />
                ))}
                </>
            </CollapsibleContent>
        </>
        </Collapsible>
    )
}

export function CategoriesClientPage({ initialCategories, specTemplates }: CategoriesClientPageProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const { toast } = useToast();

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const handleCreate = useCallback(() => {
    setSelectedCategoryId(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setFormOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setFormOpen(false);
    setSelectedCategoryId(null);
  }, []);

  const handleFormSuccess = useCallback((savedCategory: Category) => {
    setCategories(prev => {
        const index = prev.findIndex(c => c.id === savedCategory.id);
        if (index > -1) {
            const newCategories = [...prev];
            newCategories[index] = savedCategory;
            return newCategories;
        }
        return [...prev, savedCategory];
    });
    handleDialogClose();
  }, [handleDialogClose]);

  const handleDeleteInitiate = (category: Category) => {
    setCategoryToDelete(category);
  };
  
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryClient(categoryToDelete.id);
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      toast({
        title: 'Category Deleted',
        description: `The category "${categoryToDelete.name}" has been successfully removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Category',
        description: error.message || 'An unknown error occurred. Make sure it has no sub-categories.',
      });
    } finally {
      setCategoryToDelete(null);
    }
  };
  
  const getTemplateName = useCallback((templateId?: string) => {
    if (!templateId) return 'N/A';
    return specTemplates.find(t => t.id === templateId)?.name || 'Unknown';
  }, [specTemplates]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
            <p className="text-muted-foreground">Organize your marketplace categories and assign specification templates.</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2" />
            Create Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Category Hierarchy</CardTitle>
            <CardDescription>
              You have {categories.length} total categor(y/ies) defined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Spec Template</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTree.length > 0 ? (
                    categoryTree.map((category) => (
                        <CategoryRow 
                            key={category.id} 
                            category={category} 
                            level={0} 
                            onEdit={handleEdit}
                            onDelete={handleDeleteInitiate}
                            getTemplateName={getTemplateName}
                        />
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No categories found. Get started by creating one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CategoryFormDialog
        key={selectedCategoryId || 'new'}
        open={isFormOpen}
        onOpenChange={handleDialogClose}
        categoryId={selectedCategoryId}
        onSuccess={handleFormSuccess}
        allCategories={categories}
        specTemplates={specTemplates}
      />

      <DeleteConfirmationDialog
        open={!!categoryToDelete}
        onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        itemType="category"
        itemName={categoryToDelete?.name}
      />
    </>
  );
}

