"use client";

import React, { useState, useMemo } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
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
  const map: Record<string, CategoryTreeItem> = {};
  categories.forEach((cat) => {
    map[cat.id] = { ...cat, children: [] };
  });

  const tree: CategoryTreeItem[] = [];

  categories.forEach((cat) => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      tree.push(map[cat.id]);
    }
  });

  return tree;
};

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  loading,
}: CategorySidebarProps) {
  const categoryTree = buildCategoryTree(categories);

  // Accordion state (only one open)
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Auto-open parent when selected category changes
  useMemo(() => {
    if (!selectedCategoryId) return;

    const parent = categories.find(
      (c) => c.id === selectedCategoryId
    );

    if (parent?.parentId) {
      setOpenCategoryId(parent.parentId);
    } else {
      setOpenCategoryId(selectedCategoryId);
    }
  }, [selectedCategoryId, categories]);

  return (
    <div className="sticky top-20">
      <div className="rounded-xl border bg-background p-4 shadow-sm space-y-4">
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

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {categoryTree.map((item) => {
              const isOpen = openCategoryId === item.id;

              return (
                <Collapsible
                  key={item.id}
                  open={isOpen}
                  onOpenChange={() =>
                    setOpenCategoryId(isOpen ? null : item.id)
                  }
                >
                  <div
                    className={cn(
                      "group flex items-center justify-between rounded-lg transition-colors",
                      selectedCategoryId === item.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <button
                      onClick={() => onSelectCategory(item.id)}
                      className="flex-1 text-left px-3 py-2 text-sm font-semibold"
                    >
                      {item.name}
                    </button>

                    {item.children.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <button className="p-2">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform duration-200 opacity-60 group-hover:opacity-100",
                              isOpen && "rotate-90"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  {item.children.length > 0 && (
                    <CollapsibleContent className="space-y-1 mt-1">
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => onSelectCategory(child.id)}
                          className={cn(
                            "w-full text-left px-6 py-1.5 text-sm rounded-md transition-colors",
                            selectedCategoryId === child.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {child.name}
                        </button>
                      ))}
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}