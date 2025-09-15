
"use client";

import React, { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { getCategoriesClient } from '@/lib/firebase';
import { Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const iconMap: { [key: string]: React.ElementType } = {
    "Industrial Supplies": Building,
    "Raw Materials": Package,
    "Electronics": Package,
    "Beauty & Personal Care": Package,
    "Agriculture": Package,
};


const SubCategoryLink = ({ category }: { category: Category }) => (
    <Link href={`/products?category=${category.id}`} className="block text-sm text-muted-foreground hover:text-primary hover:underline">
        {category.name}
    </Link>
);

const CategoryCard = ({ category }: { category: CategoryTreeItem }) => {
    const Icon = iconMap[category.name] || Package;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <span>{category.name}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {category.children.map(child => (
                        <SubCategoryLink key={child.id} category={child} />
                    ))}
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
                    <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                    <CardContent className="space-y-2">
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
