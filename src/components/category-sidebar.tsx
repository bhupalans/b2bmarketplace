
"use client";

import React, { useState } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "./ui/skeleton";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  loading: boolean;
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

  return tree;
};

const CategoryListItem: React.FC<{
  item: CategoryTreeItem;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  level: number;
}> = ({ item, selectedCategoryId, onSelectCategory, level }) => {
  const hasChildren = item.children.length > 0;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "flex items-center justify-between rounded-md pr-2",
          selectedCategoryId === item.id && "bg-accent"
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left",
            selectedCategoryId === item.id &&
              "text-accent-foreground hover:bg-accent hover:text-accent-foreground",
            "focus-visible:ring-inset"
          )}
          style={{ paddingLeft: `${level * 1.5}rem` }}
          onClick={() => onSelectCategory(item.id)}
        >
          {item.name}
        </Button>
        {hasChildren && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-90"
                )}
              />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        )}
      </div>
      <CollapsibleContent className="space-y-1">
        {item.children.map((child) => (
          <CategoryListItem
            key={child.id}
            item={child}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
            level={level + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  loading,
}: CategorySidebarProps) {
  const categoryTree = buildCategoryTree(categories);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Categories</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectCategory(null)}
          disabled={!selectedCategoryId || loading}
        >
          Reset
        </Button>
      </div>
      <div className="space-y-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          categoryTree.map((item) => (
            <CategoryListItem
              key={item.id}
              item={item}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              level={0}
            />
          ))
        )}
      </div>
    </div>
  );
}
