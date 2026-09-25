"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, Check, SlidersHorizontal } from "lucide-react";
import type { CategoryResponse } from "@ecommers/types";

export interface ProductFiltersProps {
    categories: CategoryResponse[];
    selectedCategorySlug?: string;
    currentMinPrice?: number;
    currentMaxPrice?: number;
}

export function ProductFilters({
    categories,
    selectedCategorySlug,
    currentMinPrice,
    currentMaxPrice,
}: ProductFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [minPrice, setMinPrice] = useState<string>(currentMinPrice ? String(currentMinPrice) : "");
    const [maxPrice, setMaxPrice] = useState<string>(currentMaxPrice ? String(currentMaxPrice) : "");
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    const updateFilter = (newParams: Record<string, string | null>) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        for (const [key, value] of Object.entries(newParams)) {
            if (value === null || value === "") {
                current.delete(key);
            } else {
                current.set(key, value);
            }
        }

        // Reset to page 1 on filter change
        current.delete("page");

        const search = current.toString();
        const query = search ? `?${search}` : "";
        router.push(`/products${query}`);
    };

    const handleApplyPrice = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilter({
            minPrice: minPrice ? minPrice : null,
            maxPrice: maxPrice ? maxPrice : null,
        });
    };

    const handleClearAll = () => {
        setMinPrice("");
        setMaxPrice("");
        router.push("/products");
    };

    const activeFilterCount =
        (selectedCategorySlug ? 1 : 0) +
        (currentMinPrice ? 1 : 0) +
        (currentMaxPrice ? 1 : 0);

    const filterContent = (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-zinc-700" />
                    <span className="font-bold text-sm text-zinc-900">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                    >
                        Reset all
                    </button>
                )}
            </div>

            {/* Categories Hierarchy */}
            <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Categories
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    <button
                        type="button"
                        onClick={() => updateFilter({ category: null })}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                            !selectedCategorySlug
                                ? "bg-emerald-50 text-emerald-800 font-bold"
                                : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                    >
                        <span>All Harvests</span>
                        {!selectedCategorySlug && <Check size={14} className="text-emerald-700" />}
                    </button>

                    {categories.map((cat) => {
                        const isSelected = selectedCategorySlug === cat.slug;
                        return (
                            <button
                                key={cat.id || cat.slug}
                                type="button"
                                onClick={() => updateFilter({ category: cat.slug })}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                                    isSelected
                                        ? "bg-emerald-50 text-emerald-800 font-bold"
                                        : "text-zinc-600 hover:bg-zinc-100"
                                }`}
                            >
                                <span className="truncate">{cat.name}</span>
                                {isSelected && <Check size={14} className="text-emerald-700" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-3 pt-3 border-t border-zinc-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Price Range (₹)
                </h4>
                <form onSubmit={handleApplyPrice} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-zinc-400 font-medium">Min (₹)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-400 font-medium">Max (₹)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="5000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                    >
                        Apply Price
                    </button>
                </form>
            </div>

            {/* Quality Standard Info Pill */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-[11px] text-emerald-800">
                    <span>🌱 Pure Harvest Certified</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800/80">
                    All items pass moisture & microbial checks with batch QR traceability.
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sticky Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-24 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
                    {filterContent}
                </div>
            </aside>

            {/* Mobile Filter Button Drawer Trigger */}
            <div className="lg:hidden mb-4">
                <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 shadow-2xs"
                >
                    <SlidersHorizontal size={14} />
                    <span>Filter & Refine</span>
                    {activeFilterCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Mobile Drawer Modal */}
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                            onClick={() => setIsMobileFilterOpen(false)}
                        />
                        <div className="fixed inset-y-0 left-0 max-w-full flex">
                            <div className="w-screen max-w-xs bg-white p-5 shadow-xl flex flex-col justify-between overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                                        <h3 className="font-bold text-sm text-zinc-900">Refine Products</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsMobileFilterOpen(false)}
                                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    {filterContent}
                                </div>

                                <div className="pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileFilterOpen(false)}
                                        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                                    >
                                        Show Results
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
