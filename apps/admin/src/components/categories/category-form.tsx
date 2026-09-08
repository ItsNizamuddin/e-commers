"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput, SeoMetadata } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Textarea,
    Label,
} from "@ecommers/ui";
import {
    ArrowLeft,
    FolderTree,
    Globe,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { CategorySeoCard } from "./category-seo-card";
import { CategorySocialCard } from "./category-social-card";
import { CategoryHierarchyCard } from "./category-hierarchy-card";
import { CategoryThumbnailCard } from "./category-thumbnail-card";
import { CategorySeoChecklist } from "./category-seo-checklist";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export interface CategoryFormProps {
    mode: "create" | "edit";
    category?: CategoryResponse | null;
    categories: CategoryResponse[];
    isLoadingCategories?: boolean;
    onSubmit: (payload: CreateCategoryInput | UpdateCategoryInput) => Promise<void>;
    isSubmitting: boolean;
    onDelete?: () => Promise<void>;
    isDeleting?: boolean;
    saveNotice?: string | null;
    errorMessage?: string | null;
    defaultParentId?: string;
}

export function CategoryForm({
    mode,
    category,
    categories,
    isLoadingCategories = false,
    onSubmit,
    isSubmitting,
    onDelete,
    isDeleting = false,
    saveNotice,
    errorMessage,
    defaultParentId,
}: CategoryFormProps) {
    const router = useRouter();

    // Form states
    const [name, setName] = useState(category?.name || "");
    const [slug, setSlug] = useState(category?.slug || "");
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(category));
    const [description, setDescription] = useState(category?.description || "");
    const [parentId, setParentId] = useState(category?.parentId || defaultParentId || "");
    const [image, setImage] = useState(category?.image || "");
    const [isActive, setIsActive] = useState(category?.isActive ?? true);
    const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);

    // SEO states
    const [metaTitle, setMetaTitle] = useState(category?.seo?.metaTitle || "");
    const [metaDescription, setMetaDescription] = useState(category?.seo?.metaDescription || "");
    const [keywords, setKeywords] = useState<string[]>(category?.seo?.keywords || []);
    const [metaRobots, setMetaRobots] = useState(category?.seo?.metaRobots || "index, follow");
    const [canonicalUrl, setCanonicalUrl] = useState(category?.seo?.canonicalUrl || "");
    const [ogTitle, setOgTitle] = useState(category?.seo?.ogTitle || "");
    const [ogDescription, setOgDescription] = useState(category?.seo?.ogDescription || "");
    const [ogImage, setOgImage] = useState(category?.seo?.ogImage || "");

    // Handle name input and auto-slugify
    const handleNameChange = (val: string) => {
        setName(val);
        if (!isSlugManuallyEdited) {
            setSlug(slugify(val));
        }
    };

    const handleSlugChange = (val: string) => {
        setIsSlugManuallyEdited(true);
        setSlug(slugify(val));
    };

    // Keep parentId in sync with defaultParentId prop
    useEffect(() => {
        if (mode === "create" && defaultParentId) {
            setParentId(defaultParentId);
        }
    }, [mode, defaultParentId]);

    const parentCategory = categories.find((c) => c.id === parentId);

    // Calculate SEO health score
    const seoChecks = [
        { label: "Category Name provided", done: name.trim().length > 0 },
        { label: "Meta Title length (50-60 chars)", done: metaTitle.length >= 40 && metaTitle.length <= 65 },
        { label: "Meta Description length (120-160 chars)", done: metaDescription.length >= 80 && metaDescription.length <= 165 },
        { label: "Keywords added", done: keywords.length > 0 },
        { label: "Category Image set", done: image.trim().length > 0 },
        { label: "Social Card configured", done: Boolean(ogTitle || ogImage) },
    ];
    const isOptimized = seoChecks.filter((c) => c.done).length >= 4;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const finalSlug = slug.trim() || slugify(name);

        const seoPayload: SeoMetadata = {
            metaTitle: metaTitle.trim() || undefined,
            metaDescription: metaDescription.trim() || undefined,
            metaRobots: metaRobots || "index, follow",
            keywords: keywords.length > 0 ? keywords : undefined,
            canonicalUrl: canonicalUrl.trim() || undefined,
            ogTitle: ogTitle.trim() || undefined,
            ogDescription: ogDescription.trim() || undefined,
            ogImage: ogImage.trim() || undefined,
        };

        const hasAnySeo = Object.values(seoPayload).some((v) => v !== undefined);

        const payload: CreateCategoryInput = {
            name: name.trim(),
            slug: finalSlug,
            description: description.trim() || undefined,
            parentId: parentId ? parentId : null,
            image: image.trim() || undefined,
            isActive,
            sortOrder: Number(sortOrder) || 0,
            seo: hasAnySeo ? seoPayload : undefined,
        };

        await onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/categories")}
                        className="gap-1.5 h-8 text-xs text-slate-600 dark:text-neutral-300"
                    >
                        <ArrowLeft size={13} />
                        <span>Categories</span>
                    </Button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <FolderTree size={15} className="text-blue-600 dark:text-blue-400" />
                                <span>{mode === "create" ? "Create Category" : category?.name || "Edit Category"}</span>
                            </h1>
                            {mode === "create" && parentCategory && (
                                <Badge variant="primary" size="sm" className="gap-1">
                                    <FolderTree size={10} />
                                    <span>Subcategory of: {parentCategory.name}</span>
                                </Badge>
                            )}
                            {mode === "edit" && (
                                <Badge variant={isActive ? "success" : "neutral"} size="sm">
                                    {isActive ? "Active" : "Inactive"}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/categories")}
                        disabled={isSubmitting}
                        className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 shadow-sm"
                    >
                        {mode === "create" ? "Create Category" : "Save Changes"}
                    </Button>
                </div>
            </div>

            {/* Success Notification Banner */}
            {saveNotice && (
                <div className="flex items-center gap-2 p-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{saveNotice}</span>
                </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs">
                    <AlertCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Main Content Area (2 cols) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* General Information Card */}
                    <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                            <div>
                                <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                    General Details
                                </h2>
                                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                    Name, URL slug, and customer-facing description.
                                </p>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
                                Required *
                            </span>
                        </div>

                        <div className="space-y-3.5">
                            {/* Name */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label required>Category Name</Label>
                                </div>
                                <Input
                                    size="sm"
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Organic Dairy & Eggs"
                                    disabled={isSubmitting}
                                    required
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label required>URL Slug</Label>
                                    <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                        Auto-generated from name
                                    </span>
                                </div>
                                <Input
                                    size="sm"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="organic-dairy-eggs"
                                    disabled={isSubmitting}
                                />
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-neutral-400">
                                    <Globe size={11} className="text-slate-400" />
                                    <span>Storefront URL:</span>
                                    <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 font-mono">
                                        /{slug || "category-slug"}
                                    </code>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label>Description</Label>
                                    <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                        Optional
                                    </span>
                                </div>
                                <Textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide a clear description of the products contained in this category..."
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* SEO & Search Engine Optimization Card */}
                    <CategorySeoCard
                        name={name}
                        slug={slug}
                        description={description}
                        metaTitle={metaTitle}
                        setMetaTitle={setMetaTitle}
                        metaDescription={metaDescription}
                        setMetaDescription={setMetaDescription}
                        keywords={keywords}
                        setKeywords={setKeywords}
                        metaRobots={metaRobots}
                        setMetaRobots={setMetaRobots}
                        canonicalUrl={canonicalUrl}
                        setCanonicalUrl={setCanonicalUrl}
                        isOptimized={isOptimized}
                        disabled={isSubmitting}
                    />

                    {/* Social Media & Open Graph Sharing Card */}
                    <CategorySocialCard
                        name={name}
                        description={description}
                        image={image}
                        metaTitle={metaTitle}
                        metaDescription={metaDescription}
                        ogTitle={ogTitle}
                        setOgTitle={setOgTitle}
                        ogDescription={ogDescription}
                        setOgDescription={setOgDescription}
                        ogImage={ogImage}
                        setOgImage={setOgImage}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Sidebar Column (1 col) */}
                <div className="flex flex-col gap-4">
                    {/* Taxonomy & Hierarchy Card */}
                    <CategoryHierarchyCard
                        parentId={parentId}
                        setParentId={setParentId}
                        categories={categories}
                        currentCategoryId={category?.id}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                        isActive={isActive}
                        setIsActive={setIsActive}
                        disabled={isSubmitting}
                        isLoadingCategories={isLoadingCategories}
                    />

                    {/* Media Card */}
                    <CategoryThumbnailCard
                        image={image}
                        setImage={setImage}
                        disabled={isSubmitting}
                    />

                    {/* SEO Health Checklist Card */}
                    <CategorySeoChecklist checks={seoChecks} />
                </div>
            </div>

            {/* Bottom Floating/Sticky Action Bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 mt-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/categories")}
                    disabled={isSubmitting}
                    className="h-8 text-xs text-slate-600 dark:text-neutral-300"
                >
                    Back to Categories
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={isSubmitting}
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 shadow-sm"
                    >
                        {mode === "create" ? "Create Category" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </form>
    );
}
