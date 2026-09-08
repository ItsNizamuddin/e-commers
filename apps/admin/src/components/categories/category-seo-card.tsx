"use client";

import React, { useState, useRef } from "react";
import { Card, Badge, Input, Select, Textarea, Label } from "@ecommers/ui";
import { Search, X } from "lucide-react";
import { CategorySerpPreview } from "./category-serp-preview";

export interface CategorySeoCardProps {
    name: string;
    slug: string;
    description: string;
    metaTitle: string;
    setMetaTitle: (val: string) => void;
    metaDescription: string;
    setMetaDescription: (val: string) => void;
    keywords: string[];
    setKeywords: (val: string[]) => void;
    metaRobots: string;
    setMetaRobots: (val: string) => void;
    canonicalUrl: string;
    setCanonicalUrl: (val: string) => void;
    isOptimized: boolean;
    disabled?: boolean;
}

export function CategorySeoCard({
    name,
    slug,
    description,
    metaTitle,
    setMetaTitle,
    metaDescription,
    setMetaDescription,
    keywords,
    setKeywords,
    metaRobots,
    setMetaRobots,
    canonicalUrl,
    setCanonicalUrl,
    isOptimized,
    disabled = false,
}: CategorySeoCardProps) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const addKeywords = (rawKeywords: string[]) => {
        const cleaned = rawKeywords
            .map((k) => k.trim().replace(/^#+/, ""))
            .filter((k) => k.length > 0);

        if (cleaned.length === 0) return;

        const existingLower = new Set(keywords.map((k) => k.toLowerCase()));
        const uniqueNew: string[] = [];

        for (const kw of cleaned) {
            if (!existingLower.has(kw.toLowerCase())) {
                existingLower.add(kw.toLowerCase());
                uniqueNew.push(kw);
            }
        }

        if (uniqueNew.length > 0) {
            setKeywords([...keywords, ...uniqueNew]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (inputValue.trim()) {
                addKeywords(inputValue.split(","));
                setInputValue("");
            }
        } else if (e.key === "Backspace" && inputValue === "" && keywords.length > 0) {
            e.preventDefault();
            setKeywords(keywords.slice(0, -1));
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");
        if (pastedText.includes(",") || pastedText.includes("\n")) {
            e.preventDefault();
            const parts = pastedText.split(/[,\n]/);
            addKeywords(parts);
            setInputValue("");
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            addKeywords(inputValue.split(","));
            setInputValue("");
        }
    };

    const removeKeyword = (indexToRemove: number) => {
        if (disabled) return;
        setKeywords(keywords.filter((_, idx) => idx !== indexToRemove));
    };

    const clearAllKeywords = () => {
        if (disabled) return;
        setKeywords([]);
    };

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Search size={13} />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Search Engine Optimization (SEO)
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Fine-tune how Google and search crawlers index and display this category.
                        </p>
                    </div>
                </div>
                <Badge variant={isOptimized ? "success" : "neutral"} size="sm">
                    {isOptimized ? "Optimized" : "Basic"}
                </Badge>
            </div>

            {/* Google SERP Live Snippet Box */}
            <CategorySerpPreview
                name={name}
                slug={slug}
                metaTitle={metaTitle}
                metaDescription={metaDescription}
                description={description}
            />

            {/* SEO Fields */}
            <div className="space-y-3.5">
                {/* Meta Title */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <Label>Meta Title</Label>
                        <span
                            className={`text-[11px] font-mono ${
                                metaTitle.length > 60
                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-slate-400 dark:text-neutral-500"
                            }`}
                        >
                            {metaTitle.length} / 60 chars
                        </span>
                    </div>
                    <Input
                        size="sm"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={name ? `${name} | Fresh & Organic Delivery` : "e.g. Fresh Organic Apples & Citrus | Buy Online"}
                        disabled={disabled}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Optimal length: 50–60 characters. Kept concise so Google won&apos;t truncate your title.
                    </p>
                </div>

                {/* Meta Description */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <Label>Meta Description</Label>
                        <span
                            className={`text-[11px] font-mono ${
                                metaDescription.length > 160
                                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                                    : "text-slate-400 dark:text-neutral-500"
                            }`}
                        >
                            {metaDescription.length} / 160 chars
                        </span>
                    </div>
                    <Textarea
                        rows={3}
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Shop our fresh, hand-picked organic fruits delivered straight from local farms to your door. Free shipping over $50."
                        disabled={disabled}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Recommended: 120–160 characters. A compelling call-to-action improves search click-through rate.
                    </p>
                </div>

                {/* Keywords Tag Input */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <Label>Search Keywords</Label>
                            {keywords.length > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                                    {keywords.length}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {keywords.length > 1 && !disabled && (
                                <button
                                    type="button"
                                    onClick={clearAllKeywords}
                                    className="text-[11px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    Clear all
                                </button>
                            )}
                            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300">Enter</kbd> or <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300">,</kbd> to add
                            </span>
                        </div>
                    </div>

                    {/* Unified Chip Container */}
                    <div
                        onClick={() => inputRef.current?.focus()}
                        className={`min-h-[40px] px-2.5 py-1.5 rounded-md border flex flex-wrap items-center gap-1.5 transition-all cursor-text ${
                            disabled
                                ? "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                                : "bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15"
                        }`}
                    >
                        {keywords.map((kw, idx) => (
                            <span
                                key={`${kw}-${idx}`}
                                className="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 shadow-2xs animate-in fade-in zoom-in-95 duration-100"
                            >
                                <span className="select-none text-blue-400 dark:text-blue-500 font-normal">#</span>
                                <span>{kw}</span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeKeyword(idx);
                                        }}
                                        className="p-0.5 ml-0.5 rounded hover:bg-blue-200/60 dark:hover:bg-blue-800/60 text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
                                        title={`Remove "${kw}"`}
                                        aria-label={`Remove keyword ${kw}`}
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </span>
                        ))}

                        <div className="flex-1 min-w-[140px] flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                onBlur={handleBlur}
                                placeholder={
                                    keywords.length === 0
                                        ? "Type keyword and press Enter (e.g. fresh fruits)..."
                                        : "Add another keyword..."
                                }
                                disabled={disabled}
                                className="w-full text-xs bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 py-1"
                            />
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Type keywords relevant to this category and hit Enter or comma. You can also paste comma-separated text.
                    </p>
                </div>

                {/* Robots & Canonical Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                        <Label className="mb-1">Robots Indexing Directive</Label>
                        <Select
                            size="sm"
                            value={metaRobots}
                            onChange={(e) => setMetaRobots(e.target.value)}
                            disabled={disabled}
                            options={[
                                { value: "index, follow", label: "index, follow (Standard / Recommended)" },
                                { value: "noindex, follow", label: "noindex, follow (Hide from search)" },
                                { value: "index, nofollow", label: "index, nofollow (Index without links)" },
                                { value: "noindex, nofollow", label: "noindex, nofollow (Completely ignore)" },
                            ]}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">Canonical URL</Label>
                        <Input
                            size="sm"
                            value={canonicalUrl}
                            onChange={(e) => setCanonicalUrl(e.target.value)}
                            placeholder="https://yourstore.com/categories/..."
                            disabled={disabled}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}
