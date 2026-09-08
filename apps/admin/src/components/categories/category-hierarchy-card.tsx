"use client";

import React from "react";
import { Card, Select, Input, Label } from "@ecommers/ui";
import { FolderTree } from "lucide-react";
import type { CategoryResponse } from "@ecommers/types";

export interface CategoryHierarchyCardProps {
    parentId: string;
    setParentId: (val: string) => void;
    categories: CategoryResponse[];
    currentCategoryId?: string;
    sortOrder: number;
    setSortOrder: (val: number) => void;
    isActive: boolean;
    setIsActive: (val: boolean) => void;
    disabled?: boolean;
    isLoadingCategories?: boolean;
}

export function CategoryHierarchyCard({
    parentId,
    setParentId,
    categories,
    currentCategoryId,
    sortOrder,
    setSortOrder,
    isActive,
    setIsActive,
    disabled = false,
    isLoadingCategories = false,
}: CategoryHierarchyCardProps) {
    // Filter out itself to prevent circular nesting
    const availableParents = currentCategoryId
        ? categories.filter((c) => c.id !== currentCategoryId)
        : categories;

    const selectedParent = categories.find((c) => c.id === parentId);

    const parentOptions = [
        { value: "", label: "None (Top-Level Category)" },
        ...availableParents.map((c) => ({
            value: c.id,
            label: c.name,
        })),
    ];

    // Ensure selected parentId is always present in options even while categories are loading
    if (parentId && !parentOptions.some((opt) => opt.value === parentId)) {
        parentOptions.push({
            value: parentId,
            label: selectedParent?.name || "Loading parent category...",
        });
    }

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white pb-2 mb-3 border-b border-slate-100 dark:border-neutral-800">
                Hierarchy & Placement
            </h2>

            <div className="space-y-3.5">
                {/* Parent Category */}
                <div>
                    <Label className="mb-1">Parent Category</Label>
                    <Select
                        size="sm"
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        disabled={disabled || isLoadingCategories}
                        options={parentOptions}
                    />
                    {selectedParent ? (
                        <div className="flex items-center gap-1.5 mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium animate-in fade-in duration-150">
                            <FolderTree size={13} className="shrink-0 text-blue-600 dark:text-blue-400" />
                            <span>Adding as subcategory of <strong>&quot;{selectedParent.name}&quot;</strong></span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                            Nest this category under another category or keep as a main section.
                        </p>
                    )}
                </div>

                {/* Sort Order */}
                <div>
                    <Label className="mb-1">Display Sort Order</Label>
                    <Input
                        size="sm"
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                        disabled={disabled}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Lower numbers appear first in menu navigation.
                    </p>
                </div>

                {/* Visibility Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <Label>Storefront Visibility</Label>
                            <div className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                                {isActive ? "Visible in navigation & catalog" : "Hidden from customers"}
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            onClick={() => setIsActive(!isActive)}
                            disabled={disabled}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? "bg-blue-600" : "bg-slate-200 dark:bg-neutral-800"
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isActive ? "translate-x-4" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
