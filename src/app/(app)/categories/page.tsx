
"use client";

import React, { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { getCategoriesClient } from '@/lib/firebase';
import { Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

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
  
  const sortRecursive = (nodes: CategoryTreeItem[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortRecursive(node.children));
  }
  sortRecursive(tree);

  return tree;
};

const SubCategoryLink = ({ category }: { category: Category }) => (
    <Link href={`/products?category=${category.id}`} className="block text-sm text-muted-foreground hover:text-primary hover:underline">
        {category.name}
    </Link>
);

const CategoryCard = ({ category }: { category: CategoryTreeItem }) => {
    return (
        <Card className="group flex flex-col overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="p-0">
                <Link href={`/products?category=${category.id}`} className="block">
                    <div className="relative aspect-video w-full">
                         <Image 
                            src={category.imageUrl || "https://placehold.co/400x300"} 
                            alt={category.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <CardTitle className="absolute bottom-4 left-4 text-primary-foreground text-lg">{category.name}</CardTitle>
                    </div>
                </Link>
            </CardHeader>
            <CardContent className="flex-grow p-4">
                <div className="space-y-2">
                    {category.children.slice(0, 5).map(child => (
                        <SubCategoryLink key={child.id} category={child} />
                    ))}
                    {category.children.length > 5 && (
                        <Link href={`/products?category=${category.id}`} className="block text-sm text-primary hover:underline pt-1">
                            More...
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function AllCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const fetchedCategories = await getCategoriesClient();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categoryTree = buildCategoryTree(categories);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Categories</h1>
        <p className="text-muted-foreground">Browse all product categories available in the marketplace.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="p-0"><Skeleton className="aspect-video w-full" /></CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryTree.map(rootCategory => (
                <CategoryCard key={rootCategory.id} category={rootCategory} />
            ))}
        </div>
      )}
    </div>
  );
}
