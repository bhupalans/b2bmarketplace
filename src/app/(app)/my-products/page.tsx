
"use client";

import React, { useState, useEffect, useTransition } from 'react';
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
import { Product } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { getSellerProducts } from '@/lib/firestore';
import Image from 'next/image';
import { ProductFormDialog } from '@/components/product-form';
import { deleteProductAction } from '@/app/actions';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function MyProductsPage() {
  const { user, firebaseUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.role === 'seller') {
      getSellerProducts(user.id)
        .then(data => {
          setProducts(data);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setFormOpen(true);
  };

  const handleFormSuccess = (updatedProduct: Product) => {
    if(selectedProduct) {
        // Edit
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } else {
        // Create
        setProducts([...products, updatedProduct]);
    }
    setFormOpen(false);
  };

  const handleDelete = (productId: string) => {
    startDeleteTransition(async () => {
        if (!firebaseUser) {
             toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
             return;
        }
        const idToken = await firebaseUser.getIdToken();
        const result = await deleteProductAction({ productId, idToken });

        if(result.success) {
            setProducts(products.filter(p => p.id !== productId));
            toast({
                title: 'Product Deleted',
                description: 'The product has been successfully removed.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error Deleting Product',
                description: result.error || 'An unknown error occurred.',
            });
        }
    });
  }


  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
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
        open={isFormOpen}
        onOpenChange={setFormOpen}
        product={selectedProduct}
        onSuccess={handleFormSuccess}
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
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                             </DropdownMenuItem>
                             <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-500 hover:text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your product
                                and remove its data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)} disabled={isDeleting}>
                                {isDeleting && <Loader2 className="mr-2 animate-spin" />}
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No products found. Get started by creating one!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
