
"use client";

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Loader2 } from "lucide-react";
import { Category, Product } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { getSellerProductsClient, getCategoriesClient, deleteProductClient } from '@/lib/firebase';
import Image from 'next/image';
import { ProductFormDialog } from '@/components/product-form';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

export default function MyProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.role === 'seller') {
      const fetchData = async () => {
        try {
          const [productData, categoryData] = await Promise.all([
            getSellerProductsClient(user.id),
            getCategoriesClient(),
          ]);
          setProducts(productData);
          setCategories(categoryData);
        } catch (error) {
          console.error("Failed to fetch data for My Products page:", error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load your products and categories.',
          });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (user) {
      setLoading(false);
    }
  }, [user, toast]);

  const handleEdit = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedProductId(null);
    setFormOpen(true);
  }, []);

  const handleFormSuccess = useCallback((updatedProduct: Product) => {
    setProducts((prevProducts) => {
      const existingProductIndex = prevProducts.findIndex(p => p.id === updatedProduct.id);
      if (existingProductIndex > -1) {
        // Edit
        const newProducts = [...prevProducts];
        newProducts[existingProductIndex] = updatedProduct;
        return newProducts;
      } else {
        // Create
        return [updatedProduct, ...prevProducts];
      }
    });
    setFormOpen(false);
    setSelectedProductId(null);
  }, []);
  
  const handleDialogClose = useCallback(() => {
    setFormOpen(false);
    setSelectedProductId(null);
  }, []);


  const handleDeleteInitiate = useCallback((product: Product) => {
    setProductToDelete(product);
    setAlertOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!productToDelete || !user) return;
    
    startDeleteTransition(async () => {
      try {
        await deleteProductClient(productToDelete);
        setProducts((prev) => prev.filter(p => p.id !== productToDelete.id));
        toast({
          title: 'Product Deleted',
          description: 'The product has been successfully removed.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error Deleting Product',
          description: error.message || 'An unknown error occurred.',
        });
      } finally {
        setAlertOpen(false);
        setProductToDelete(null);
      }
    });
  }, [productToDelete, user, toast]);

  const handleCloseAlert = useCallback(() => {
    setProductToDelete(null);
    setAlertOpen(false);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Products</h1>
            <p className="text-muted-foreground">Manage your product listings.</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2" />
            Create Product
          </Button>
        </div>

        <ProductFormDialog
          key={selectedProductId || 'new'}
          open={isFormOpen}
          onOpenChange={handleDialogClose}
          productId={selectedProductId}
          onSuccess={handleFormSuccess}
          categories={categories}
        />

        <Card>
          <CardHeader>
            <CardTitle>Product List</CardTitle>
            <CardDescription>
              You have {products.length} product(s) listed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price (USD)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="hidden sm:table-cell">
                        <div className="relative h-16 w-16 overflow-hidden rounded-md">
                          <Image
                              src={product.images[0] || 'https://placehold.co/100x100'}
                              alt={product.title}
                              fill
                              className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>${product.priceUSD.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === 'approved'
                              ? 'default'
                              : product.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="capitalize"
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(product.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-500 hover:text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteInitiate(product)}
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No products found. Get started by creating one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your product
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseAlert}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
