"use client";

import React from "react";
import { Globe } from "lucide-react";

export interface CategorySerpPreviewProps {
    name: string;
    slug: string;
    metaTitle: string;
    metaDescription: string;
    description: string;
}

export function CategorySerpPreview({
    name,
    slug,
    metaTitle,
    metaDescription,
    description,
}: CategorySerpPreviewProps) {
    const displayTitle = metaTitle || name || "Category Name";
    const displaySnippet =
        metaDescription ||
        description ||
        "Add a meta description to control the snippet displayed below your title in Google search results.";

    return (
        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                    <Globe size={11} />
                    Google SERP Live Preview
                </span>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                    Simulated Search Result
                </span>
            </div>

            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-neutral-400 truncate">
                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-neutral-300">
                        S
                    </div>
                    <span className="font-medium text-slate-700 dark:text-neutral-300">yourstore.com</span>
                    <span>›</span>
                    <span>categories</span>
                    <span>›</span>
                    <span className="text-slate-500 dark:text-neutral-400">{slug || "new-category"}</span>
                </div>

                <div className="text-[15px] leading-tight font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                    {displayTitle} | your store
                </div>

                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-snug line-clamp-2">
                    {displaySnippet}
                </p>
            </div>
        </div>
    );
}
