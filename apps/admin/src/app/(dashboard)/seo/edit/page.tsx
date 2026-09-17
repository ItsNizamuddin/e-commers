"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    useGetSeoMetadataRowsQuery,
    useUpdateSeoRowMutation,
} from "@/store/api";
import type { SeoEntityType } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Textarea,
    Label,
    Spinner,
    toast,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Save,
    Globe,
    MapPin,
    Search,
    FileText,
    Share2,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    Layers,
    ChevronRight,
} from "lucide-react";
import { SeoRichContentEditor } from "@/components/seo/seo-rich-content-editor";

interface MetadataRowItem {
    id: string;
    locationKey: string;
    locationName: string;
    locationType: string;
    currency?: string;
    slug: string;
    robots: string;
    updatedAt: string | Date;
    metaTitle?: string;
    metaDescription?: string;
    deliveryHighlight?: string;
    canonicalUrl?: string;
    keywords?: string[];
    isIndexed?: boolean;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    internalSection?: { title?: string; value?: string };
    bottomSection?: { title?: string; value?: string };
}

function EditSeoPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const entityType = (searchParams.get("type") || "PRODUCT").toUpperCase() as SeoEntityType;
    const entityId = searchParams.get("id") || "";
    const targetLocation = (searchParams.get("location") || "GLOBAL").toLowerCase();

    const {
        data: metadataRowsData,
        isLoading,
        error: queryError,
        refetch,
    } = useGetSeoMetadataRowsQuery(
        { entityType, entityId },
        { skip: !entityId }
    );
    const [updateSeoRow, { isLoading: isSaving }] = useUpdateSeoRowMutation();

    const [error, setError] = useState<string | null>(null);

    const entityInfo = metadataRowsData?.entity || null;
    const allRows: MetadataRowItem[] = (metadataRowsData?.rows as MetadataRowItem[]) || [];
    const [activeRow, setActiveRow] = useState<MetadataRowItem | null>(null);

    // Form fields
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [metaRobots, setMetaRobots] = useState("index, follow");
    const [canonicalUrl, setCanonicalUrl] = useState("");
    const [keywordsStr, setKeywordsStr] = useState("");
    const [deliveryHighlight, setDeliveryHighlight] = useState("");
    const [isIndexed, setIsIndexed] = useState(true);

    // Social fields (Global / Main Page)
    const [ogTitle, setOgTitle] = useState("");
    const [ogDescription, setOgDescription] = useState("");
    const [ogImage, setOgImage] = useState("");

    // Rich content sections
    const [internalTitle, setInternalTitle] = useState("");
    const [internalValue, setInternalValue] = useState("");
    const [bottomTitle, setBottomTitle] = useState("");
    const [bottomValue, setBottomValue] = useState("");

    // Active tab in the edit form
    const [activeTab, setActiveTab] = useState<"meta" | "content" | "social">("meta");

    useEffect(() => {
        if (!entityId) {
            setError("No entity ID provided.");
            return;
        }

        if (allRows.length > 0) {
            const found = allRows.find(
                (r) => r.locationKey.toLowerCase() === targetLocation
            ) || allRows[0];

            if (found) {
                applyRowToState(found);
            } else {
                setError(`Location "${targetLocation}" was not found.`);
            }
        }
    }, [allRows, entityId, targetLocation]);

    const applyRowToState = (row: MetadataRowItem) => {
        setActiveRow(row);
        setMetaTitle(row.metaTitle || "");
        setMetaDescription(row.metaDescription || "");
        setMetaRobots(row.robots || "index, follow");
        setCanonicalUrl(row.canonicalUrl || "");
        setKeywordsStr((row.keywords || []).join(", "));
        setDeliveryHighlight(row.deliveryHighlight || "");
        setIsIndexed(row.isIndexed !== false);

        setOgTitle(row.ogTitle || "");
        setOgDescription(row.ogDescription || "");
        setOgImage(row.ogImage || "");

        setInternalTitle(row.internalSection?.title || "");
        setInternalValue(row.internalSection?.value || "");
        setBottomTitle(row.bottomSection?.title || "");
        setBottomValue(row.bottomSection?.value || "");
    };

    const isGlobal = activeRow?.locationKey.toUpperCase() === "GLOBAL";

    // Switch location smoothly without losing context
    const handleLocationSwitch = (newLocationKey: string) => {
        const found = allRows.find((r) => r.locationKey.toLowerCase() === newLocationKey.toLowerCase());
        if (found) {
            applyRowToState(found);
            router.replace(`/seo/edit?type=${entityType}&id=${entityId}&location=${found.locationKey}`);
        }
    };

    // Save changes handler
    const handleSave = async (returnToTable: boolean = true) => {
        if (!activeRow) return;
        setError(null);

        try {
            const keywords = keywordsStr
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean);

            const payload: Record<string, any> = {
                metaTitle: metaTitle.trim(),
                metaDescription: metaDescription.trim(),
                metaRobots: metaRobots.trim(),
                keywords,
                canonicalUrl: canonicalUrl.trim(),
                internalSection: {
                    title: internalTitle.trim(),
                    value: internalValue,
                },
                bottomSection: {
                    title: bottomTitle.trim(),
                    value: bottomValue,
                },
            };

            if (isGlobal) {
                payload.ogTitle = ogTitle.trim();
                payload.ogDescription = ogDescription.trim();
                payload.ogImage = ogImage.trim();
            } else {
                payload.locationKey = activeRow.locationKey;
                payload.locationName = activeRow.locationName;
                payload.locationType = activeRow.locationType;
                payload.currency = activeRow.currency || "INR";
                payload.deliveryHighlight = deliveryHighlight.trim();
                payload.isIndexed = isIndexed;
            }

            await updateSeoRow({
                entityType,
                entityId,
                locationKey: activeRow.locationKey,
                data: payload,
            }).unwrap();
            toast.success(`SEO metadata for ${activeRow.locationName} saved successfully!`);

            if (returnToTable) {
                router.push(`/seo?type=${entityType}&id=${entityId}`);
            } else {
                refetch();
            }
        } catch (err: any) {
            console.error("Failed to save SEO metadata:", err);
            const msg = err?.data?.message || err?.message || "Failed to save SEO metadata.";
            setError(msg);
            toast.error(msg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
                <Spinner size="lg" />
                <p className="text-xs text-slate-500 dark:text-neutral-400">Loading SEO metadata editor...</p>
            </div>
        );
    }

    if (error && !activeRow) {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4">
                <Card className="p-8 text-center bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                    <AlertCircle size={36} className="mx-auto text-rose-500 mb-3" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        Unable to Load SEO Record
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mb-6">{error}</p>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/seo?type=${entityType}`)}
                        className="gap-1.5"
                    >
                        <ArrowLeft size={14} />
                        <span>Return to SEO Table</span>
                    </Button>
                </Card>
            </div>
        );
    }

    const previewSlug = activeRow?.slug || entityInfo?.slug || "sample-product";
    const previewDisplayUrl = `https://yourstore.com/${entityType === "PRODUCT" ? "products" : "categories"}/${previewSlug}`;

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Top Bar Navigation & Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push(`/seo?type=${entityType}&id=${entityId}`)}
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
                        title="Return to SEO Table"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Edit SEO Metadata
                            </h1>
                            <Badge variant={isGlobal ? "primary" : "neutral"} size="sm">
                                {activeRow?.locationName || "Location"}
                            </Badge>
                            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                                {entityType}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                            <span>Home</span>
                            <ChevronRight size={12} />
                            <button
                                type="button"
                                onClick={() => router.push(`/seo?type=${entityType}&id=${entityId}`)}
                                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                SEO Metadata Table
                            </button>
                            <ChevronRight size={12} />
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                {entityInfo?.title || "Entity"} ({activeRow?.locationName})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Right Actions */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/seo?type=${entityType}&id=${entityId}`)}
                        disabled={isSaving}
                        className="text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSave(false)}
                        disabled={isSaving}
                        className="text-xs font-semibold gap-1.5"
                    >
                        <Save size={13} />
                        <span>{isSaving ? "Saving..." : "Save & Stay"}</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleSave(true)}
                        disabled={isSaving}
                        className="text-xs font-semibold gap-1.5"
                    >
                        <Save size={13} />
                        <span>{isSaving ? "Saving..." : "Save & Return"}</span>
                    </Button>
                </div>
            </div>

            {/* Location Switcher Toolbar */}
            {allRows.length > 1 && (
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-xl overflow-x-auto">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 px-2 shrink-0">
                        Locations for {entityInfo?.title}:
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {allRows.map((r) => {
                            const isCurrent = r.locationKey.toLowerCase() === activeRow?.locationKey.toLowerCase();
                            const isGlob = r.locationKey.toUpperCase() === "GLOBAL";
                            return (
                                <button
                                    key={r.locationKey}
                                    type="button"
                                    onClick={() => handleLocationSwitch(r.locationKey)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        isCurrent
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "bg-white dark:bg-[#141414] text-slate-600 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                                    }`}
                                >
                                    {isGlob ? (
                                        <Globe size={13} className={isCurrent ? "text-white" : "text-blue-500"} />
                                    ) : (
                                        <MapPin size={13} className={isCurrent ? "text-white" : "text-emerald-500"} />
                                    )}
                                    <span>{r.locationName}</span>
                                    {isCurrent && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error Notification Banner if any */}
            {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Main Form Layout: Left Column (Form Inputs) + Right Column (Live Google SERP Preview & Health) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (Inputs & Rich Editors) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Tab Selection Bar */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] px-4 rounded-t-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab("meta")}
                            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                                activeTab === "meta"
                                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            }`}
                        >
                            <Search size={14} />
                            <span>Meta Tags & Search</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("content")}
                            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                                activeTab === "content"
                                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                            }`}
                        >
                            <FileText size={14} />
                            <span>Rich Content Sections</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                WYSIWYG
                            </span>
                        </button>
                        {isGlobal && (
                            <button
                                type="button"
                                onClick={() => setActiveTab("social")}
                                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                                    activeTab === "social"
                                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                                }`}
                            >
                                <Share2 size={14} />
                                <span>Social Cards (OG)</span>
                            </button>
                        )}
                    </div>

                    {/* TAB 1: META TAGS & SEARCH */}
                    {activeTab === "meta" && (
                        <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl space-y-5 shadow-sm animate-in fade-in-50 duration-150">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label htmlFor="meta-title" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                        Meta Title
                                    </Label>
                                    <span
                                        className={`text-[11px] font-semibold ${
                                            metaTitle.length > 60
                                                ? "text-amber-500 font-bold"
                                                : metaTitle.length < 30
                                                ? "text-slate-400"
                                                : "text-emerald-500"
                                        }`}
                                    >
                                        {metaTitle.length}/60 chars (Recommended 40–60)
                                    </span>
                                </div>
                                <Input
                                    id="meta-title"
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    placeholder="Enter compelling meta title..."
                                    className="text-xs"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Displays as the clickable headline on Google SERPs.
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label htmlFor="meta-desc" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                        Meta Description
                                    </Label>
                                    <span
                                        className={`text-[11px] font-semibold ${
                                            metaDescription.length > 160
                                                ? "text-amber-500 font-bold"
                                                : metaDescription.length < 70
                                                ? "text-slate-400"
                                                : "text-emerald-500"
                                        }`}
                                    >
                                        {metaDescription.length}/160 chars (Recommended 120–160)
                                    </span>
                                </div>
                                <Textarea
                                    id="meta-desc"
                                    rows={3}
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    placeholder="Summary of page for search engine snippet..."
                                    className="text-xs"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Provides the informative description preview below the search title.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-neutral-800">
                                <div>
                                    <Label htmlFor="meta-robots" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                        Robots Indexing Tag
                                    </Label>
                                    <select
                                        id="meta-robots"
                                        value={metaRobots}
                                        onChange={(e) => setMetaRobots(e.target.value)}
                                        className="mt-1 w-full text-xs rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-3 py-2 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="index, follow">index, follow (Default - Fully Indexed)</option>
                                        <option value="noindex, follow">noindex, follow (Hide from search, follow links)</option>
                                        <option value="index, nofollow">index, nofollow (Index page, do not follow links)</option>
                                        <option value="noindex, nofollow">noindex, nofollow (Completely block search engines)</option>
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="canonical-url" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                        Canonical URL
                                    </Label>
                                    <Input
                                        id="canonical-url"
                                        value={canonicalUrl}
                                        onChange={(e) => setCanonicalUrl(e.target.value)}
                                        placeholder="https://yourstore.com/..."
                                        className="mt-1 text-xs font-mono"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Preferred URL for deduplicating identical content.
                                    </p>
                                </div>
                            </div>

                            {!isGlobal && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                                    <div>
                                        <Label htmlFor="delivery-highlight" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                            Delivery Highlight Badge
                                        </Label>
                                        <Input
                                            id="delivery-highlight"
                                            value={deliveryHighlight}
                                            onChange={(e) => setDeliveryHighlight(e.target.value)}
                                            placeholder={`Available in ${activeRow?.locationName}`}
                                            className="mt-1 text-xs"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Displays as localized badge and SERP highlight for city visitors.
                                        </p>
                                    </div>
                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-neutral-300">
                                            <input
                                                type="checkbox"
                                                checked={isIndexed}
                                                onChange={(e) => setIsIndexed(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Include this location in sitemap & search index</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                                <Label htmlFor="keywords" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                    Keywords (Comma separated)
                                </Label>
                                <Input
                                    id="keywords"
                                    value={keywordsStr}
                                    onChange={(e) => setKeywordsStr(e.target.value)}
                                    placeholder="authentic sweets, bangalore delivery, freshly prepared..."
                                    className="mt-1 text-xs"
                                />
                                {keywordsStr.trim() && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {keywordsStr.split(",").map((k, idx) => {
                                            const tag = k.trim();
                                            if (!tag) return null;
                                            return (
                                                <span
                                                    key={idx}
                                                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 rounded-md text-slate-700 dark:text-neutral-300 font-medium"
                                                >
                                                    #{tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* TAB 2: RICH CONTENT SECTIONS */}
                    {activeTab === "content" && (
                        <div className="space-y-6 animate-in fade-in-50 duration-150">
                            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="font-bold">Rich Long-Form Content & Topical Authority</p>
                                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400 mt-0.5">
                                        Use our full WYSIWYG editor to write headings, lists, tables, callout boxes, and rich paragraphs for this specific location.
                                    </p>
                                </div>
                            </div>

                            <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-4">
                                <div className="border-b border-slate-100 dark:border-neutral-800 pb-3">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        1. Internal Content Section
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Renders directly inside the product description area.
                                    </p>
                                </div>
                                <SeoRichContentEditor
                                    sectionType="internal"
                                    titleLabel="Internal Section Heading"
                                    titlePlaceholder="e.g. Traditional Preparation & Heritage Recipe"
                                    titleValue={internalTitle}
                                    onTitleChange={setInternalTitle}
                                    contentPlaceholder="Write detailed SEO paragraphs, ingredient highlights, or serving guides..."
                                    contentValue={internalValue}
                                    onContentChange={setInternalValue}
                                    description="Appears inside product or category body."
                                />
                            </Card>

                            <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-4">
                                <div className="border-b border-slate-100 dark:border-neutral-800 pb-3">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        2. Bottom SEO Section (FAQs / Local Delivery Guide)
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Placed above the footer for deep Google search indexation and rich FAQ snippets.
                                    </p>
                                </div>
                                <SeoRichContentEditor
                                    sectionType="bottom"
                                    titleLabel="Bottom Section Heading"
                                    titlePlaceholder="e.g. Frequently Asked Questions & Delivery Timelines in Bangalore"
                                    titleValue={bottomTitle}
                                    onTitleChange={setBottomTitle}
                                    contentPlaceholder="Write localized FAQs, delivery details, and customer assurance..."
                                    contentValue={bottomValue}
                                    onContentChange={setBottomValue}
                                    description="Appears before footer."
                                />
                            </Card>
                        </div>
                    )}

                    {/* TAB 3: SOCIAL CARDS (GLOBAL ONLY) */}
                    {activeTab === "social" && isGlobal && (
                        <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-5 animate-in fade-in-50 duration-150">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                                    Open Graph & Social Share Previews
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Custom tags shown when this URL is shared on WhatsApp, Facebook, LinkedIn, Twitter, etc.
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="og-title" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                    Social Share Title (og:title)
                                </Label>
                                <Input
                                    id="og-title"
                                    value={ogTitle}
                                    onChange={(e) => setOgTitle(e.target.value)}
                                    placeholder="Title when shared on social networks..."
                                    className="mt-1 text-xs"
                                />
                            </div>

                            <div>
                                <Label htmlFor="og-desc" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                    Social Share Description (og:description)
                                </Label>
                                <Textarea
                                    id="og-desc"
                                    rows={3}
                                    value={ogDescription}
                                    onChange={(e) => setOgDescription(e.target.value)}
                                    placeholder="Catchy teaser description..."
                                    className="mt-1 text-xs"
                                />
                            </div>

                            <div>
                                <Label htmlFor="og-image" className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                    Social Share Image URL (og:image)
                                </Label>
                                <Input
                                    id="og-image"
                                    value={ogImage}
                                    onChange={(e) => setOgImage(e.target.value)}
                                    placeholder="https://yourstore.com/images/share-banner.jpg"
                                    className="mt-1 text-xs font-mono"
                                />
                            </div>

                            {/* Social Card Preview */}
                            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
                                <Label className="text-xs font-bold text-slate-800 dark:text-neutral-200 block mb-2">
                                    Social Preview Preview
                                </Label>
                                <div className="max-w-md border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-neutral-900 shadow-sm">
                                    <div className="h-36 bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-400 text-xs">
                                        {ogImage ? (
                                            <img
                                                src={ogImage}
                                                alt="Social Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <Share2 size={16} />
                                                <span>No OG Image set</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                            yourstore.com
                                        </p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                                            {ogTitle || metaTitle || entityInfo?.title || "Page Title"}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                                            {ogDescription || metaDescription || "Page description preview for social networks."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: Google Search SERP Preview & SEO Health */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
                    {/* Live Google SERP Card */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-2.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                                Google Search Snippet
                            </span>
                            <Badge variant="neutral" size="sm" className="text-[10px]">
                                {isGlobal ? "Global" : activeRow?.locationName}
                            </Badge>
                        </div>

                        {/* Search Snippet Simulation */}
                        <div className="p-3.5 bg-slate-50/60 dark:bg-neutral-900/60 rounded-xl border border-slate-200/60 dark:border-neutral-800/60 space-y-1">
                            {/* Favicon & URL */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-neutral-400 truncate">
                                <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                                    S
                                </div>
                                <span className="truncate font-medium">{previewDisplayUrl}</span>
                            </div>

                            {/* Clickable Blue Headline */}
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-snug line-clamp-2">
                                {metaTitle || entityInfo?.title || "Page Title"}
                            </p>

                            {/* Description snippet */}
                            <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed line-clamp-2">
                                {metaDescription || "No meta description provided. Search engines will generate a snippet from page content."}
                            </p>

                            {/* Delivery Highlight badge */}
                            {!isGlobal && deliveryHighlight && (
                                <div className="pt-1.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 size={11} />
                                        <span>{deliveryHighlight}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* SEO Health Checklist */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block border-b border-slate-100 dark:border-neutral-800 pb-2">
                            SEO Quality Checklist
                        </span>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {metaTitle.length >= 30 && metaTitle.length <= 60 ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                                    )}
                                    <span className="text-slate-700 dark:text-neutral-300">Title Length</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">{metaTitle.length} chars</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {metaDescription.length >= 70 && metaDescription.length <= 160 ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertCircle size={14} className="text-amber-500 shrink-0" />
                                    )}
                                    <span className="text-slate-700 dark:text-neutral-300">Description Length</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">{metaDescription.length} chars</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    <span className="text-slate-700 dark:text-neutral-300">Indexing Tag</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">{metaRobots}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {internalValue.trim() ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertCircle size={14} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-slate-700 dark:text-neutral-300">Internal Rich Content</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">
                                    {internalValue.trim() ? "Configured" : "Empty"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {bottomValue.trim() ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertCircle size={14} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-slate-700 dark:text-neutral-300">Bottom FAQ Content</span>
                                </div>
                                <span className="font-mono text-[11px] text-slate-500">
                                    {bottomValue.trim() ? "Configured" : "Empty"}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Target Entity Information Card */}
                    <Card className="p-5 bg-slate-50/50 dark:bg-neutral-900/40 border-slate-200/80 dark:border-neutral-800 rounded-xl space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block">
                            Entity Summary
                        </span>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Name:</span>
                                <span className="font-semibold text-slate-800 dark:text-neutral-200">{entityInfo?.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Slug:</span>
                                <code className="font-mono text-[11px] text-slate-700 dark:text-neutral-300">{entityInfo?.slug}</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Target Location:</span>
                                <span className="font-semibold text-slate-800 dark:text-neutral-200">{activeRow?.locationName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Updated:</span>
                                <span className="text-slate-500">{activeRow?.updatedAt ? new Date(activeRow.updatedAt).toLocaleDateString() : "—"}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function EditSeoPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-24">
                    <Spinner size="lg" />
                </div>
            }
        >
            <EditSeoPageContent />
        </Suspense>
    );
}
