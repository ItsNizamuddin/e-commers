"use client";

import React, { useState, useRef, useEffect } from "react";
import type { LocationSeoOverride, ISeoContentSection } from "@ecommers/types";
import { Card, Badge, Input, Select, Textarea, Label, Button } from "@ecommers/ui";
import {
    Search,
    Globe,
    MapPin,
    Trash2,
    X,
    ExternalLink,
    Table,
    LayoutList,
    Link2,
    RotateCcw,
    Sparkles,
} from "lucide-react";

export interface AvailableLocationOption {
    code: string;
    name: string;
    type: "CITY" | "COUNTRY" | "ZONE";
    currency?: string;
}

export interface GenericSeoCardProps {
    entityTitle: string;
    entitySlug: string;
    entityDescription?: string;
    routePrefix?: string; // e.g. "products" or "categories"
    categorySlug?: string; // Category slug for canonical URLs and breadcrumb hierarchy

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

    // Rich SEO Content Sections
    internalSection?: ISeoContentSection;
    setInternalSection?: (val: ISeoContentSection) => void;
    bottomSection?: ISeoContentSection;
    setBottomSection?: (val: ISeoContentSection) => void;

    // Location SEO overrides
    locationOverrides?: LocationSeoOverride[];
    setLocationOverrides?: (overrides: LocationSeoOverride[]) => void;
    availableLocations?: AvailableLocationOption[];

    disabled?: boolean;
}

interface LocationCustomizedFlags {
    title?: boolean;
    desc?: boolean;
    keywords?: boolean;
    canonical?: boolean;
    badge?: boolean;
    internal?: boolean;
    bottom?: boolean;
}

import { SeoRichContentEditor } from "./seo-rich-content-editor";

const ContentSectionEditor = SeoRichContentEditor;

export function GenericSeoCard({
    entityTitle,
    entitySlug,
    entityDescription = "",
    routePrefix = "products",
    categorySlug = "",
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
    internalSection = { title: "", value: "" },
    setInternalSection,
    bottomSection = { title: "", value: "" },
    setBottomSection,
    locationOverrides = [],
    setLocationOverrides,
    availableLocations = [],
    disabled = false,
}: GenericSeoCardProps) {
    // View mode: "tabs" or "matrix"
    const [viewMode, setViewMode] = useState<"tabs" | "matrix">("tabs");
    // Active tab: "GLOBAL" or locationKey
    const [activeTab, setActiveTab] = useState<string>("GLOBAL");
    const [keywordInput, setKeywordInput] = useState("");
    const keywordInputRef = useRef<HTMLInputElement>(null);

    // Track which fields have been manually customized per location
    const [customizedFields, setCustomizedFields] = useState<Record<string, LocationCustomizedFlags>>({});

    // Filter available locations that aren't yet in overrides
    const unconfiguredLocations = availableLocations.filter(
        (loc) => !locationOverrides.some((o) => o.locationKey.toLowerCase() === loc.code.toLowerCase())
    );

    // Active location override if not GLOBAL
    const activeOverride =
        activeTab !== "GLOBAL"
            ? locationOverrides.find((o) => o.locationKey.toLowerCase() === activeTab.toLowerCase())
            : null;

    // Helper: Build canonical URL with category slug and entity slug
    const buildDefaultCanonical = (locKey?: string) => {
        const domain = "https://yourstore.com";
        const parts: string[] = [];
        if (categorySlug) parts.push(categorySlug);
        if (routePrefix) parts.push(routePrefix);
        if (entitySlug) parts.push(entitySlug);
        if (locKey) parts.push(locKey);
        return parts.length > 0 ? `${domain}/${parts.join("/")}` : "";
    };

    // Helper: Computed simulated path for SERP preview
    const getSimulatedPath = (locKey?: string, locType?: string) => {
        const parts: string[] = [];
        if (locKey && locType === "COUNTRY") {
            parts.push(locKey);
        }
        if (categorySlug) {
            parts.push(categorySlug);
        }
        parts.push(routePrefix);
        parts.push(entitySlug || "item-slug");
        if (locKey && locType !== "COUNTRY") {
            parts.push(locKey);
        }
        return parts.join("/");
    };

    // Real-Time Propagation: Typing in Global updates uncustomized location fields
    const handleGlobalTitleChange = (newTitle: string) => {
        setMetaTitle(newTitle);
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.title;
                if (isCustom) return override;
                return { ...override, metaTitle: newTitle };
            })
        );
    };

    const handleGlobalDescriptionChange = (newDesc: string) => {
        setMetaDescription(newDesc);
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.desc;
                if (isCustom) return override;
                return { ...override, metaDescription: newDesc };
            })
        );
    };

    const handleGlobalKeywordsChange = (newKeywords: string[]) => {
        setKeywords(newKeywords);
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.keywords;
                if (isCustom) return override;
                return { ...override, keywords: [...newKeywords] };
            })
        );
    };

    const handleGlobalCanonicalChange = (newUrl: string) => {
        setCanonicalUrl(newUrl);
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.canonical;
                if (isCustom) return override;
                // Append locationKey if Global canonical URL has a value
                const locUrl = newUrl ? `${newUrl.replace(/\/$/, "")}/${override.locationKey}` : "";
                return { ...override, canonicalUrl: locUrl };
            })
        );
    };

    const handleGlobalInternalChange = (patch: Partial<ISeoContentSection>) => {
        const updated: ISeoContentSection = {
            title: patch.title !== undefined ? patch.title : internalSection?.title || "",
            value: patch.value !== undefined ? patch.value : internalSection?.value || "",
        };
        if (setInternalSection) {
            setInternalSection(updated);
        }
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.internal;
                if (isCustom) return override;
                return {
                    ...override,
                    internalSection: {
                        title: patch.title !== undefined ? patch.title : (override.internalSection?.title ?? updated.title),
                        value: patch.value !== undefined ? patch.value : (override.internalSection?.value ?? updated.value),
                    },
                };
            })
        );
    };

    const handleGlobalBottomChange = (patch: Partial<ISeoContentSection>) => {
        const updated: ISeoContentSection = {
            title: patch.title !== undefined ? patch.title : bottomSection?.title || "",
            value: patch.value !== undefined ? patch.value : bottomSection?.value || "",
        };
        if (setBottomSection) {
            setBottomSection(updated);
        }
        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((override) => {
                const isCustom = customizedFields[override.locationKey]?.bottom;
                if (isCustom) return override;
                return {
                    ...override,
                    bottomSection: {
                        title: patch.title !== undefined ? patch.title : (override.bottomSection?.title ?? updated.title),
                        value: patch.value !== undefined ? patch.value : (override.bottomSection?.value ?? updated.value),
                    },
                };
            })
        );
    };

    // Keyword management
    const addKeywords = (rawKeywords: string[]) => {
        const cleaned = rawKeywords
            .map((k) => k.trim().replace(/^#+/, ""))
            .filter((k) => k.length > 0);

        if (cleaned.length === 0) return;

        if (activeTab === "GLOBAL") {
            const existingLower = new Set(keywords.map((k) => k.toLowerCase()));
            const uniqueNew = cleaned.filter((k) => !existingLower.has(k.toLowerCase()));
            if (uniqueNew.length > 0) {
                handleGlobalKeywordsChange([...keywords, ...uniqueNew]);
            }
        } else if (activeOverride && setLocationOverrides) {
            const currentList = activeOverride.keywords || [];
            const existingLower = new Set(currentList.map((k) => k.toLowerCase()));
            const uniqueNew = cleaned.filter((k) => !existingLower.has(k.toLowerCase()));
            if (uniqueNew.length > 0) {
                markLocationFieldCustomized(activeOverride.locationKey, "keywords");
                updateOverride(activeOverride.locationKey, {
                    keywords: [...currentList, ...uniqueNew],
                });
            }
        }
    };

    const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (keywordInput.trim()) {
                addKeywords(keywordInput.split(","));
                setKeywordInput("");
            }
        } else if (e.key === "Backspace" && keywordInput === "") {
            e.preventDefault();
            if (activeTab === "GLOBAL" && keywords.length > 0) {
                handleGlobalKeywordsChange(keywords.slice(0, -1));
            } else if (activeOverride && activeOverride.keywords && activeOverride.keywords.length > 0) {
                markLocationFieldCustomized(activeOverride.locationKey, "keywords");
                updateOverride(activeOverride.locationKey, {
                    keywords: activeOverride.keywords.slice(0, -1),
                });
            }
        }
    };

    const removeKeyword = (idx: number) => {
        if (disabled) return;
        if (activeTab === "GLOBAL") {
            handleGlobalKeywordsChange(keywords.filter((_, i) => i !== idx));
        } else if (activeOverride && setLocationOverrides) {
            markLocationFieldCustomized(activeOverride.locationKey, "keywords");
            updateOverride(activeOverride.locationKey, {
                keywords: (activeOverride.keywords || []).filter((_, i) => i !== idx),
            });
        }
    };

    // Location customization helpers
    const markLocationFieldCustomized = (
        locationKey: string,
        field: keyof LocationCustomizedFlags
    ) => {
        setCustomizedFields((prev) => ({
            ...prev,
            [locationKey.toLowerCase()]: {
                ...prev[locationKey.toLowerCase()],
                [field]: true,
            },
        }));
    };

    const resetLocationFieldToGlobal = (
        locationKey: string,
        field: keyof LocationCustomizedFlags
    ) => {
        const key = locationKey.toLowerCase();
        setCustomizedFields((prev) => {
            const copy = { ...prev };
            if (copy[key]) {
                copy[key] = { ...copy[key], [field]: false };
            }
            return copy;
        });

        if (!setLocationOverrides) return;

        setLocationOverrides(
            locationOverrides.map((o) => {
                if (o.locationKey.toLowerCase() !== key) return o;
                if (field === "title") return { ...o, metaTitle: metaTitle };
                if (field === "desc") return { ...o, metaDescription: metaDescription };
                if (field === "keywords") return { ...o, keywords: [...keywords] };
                if (field === "canonical")
                    return {
                        ...o,
                        canonicalUrl: buildDefaultCanonical(o.locationKey),
                    };
                if (field === "badge")
                    return {
                        ...o,
                        deliveryHighlight: `Available in ${o.locationName}`,
                    };
                if (field === "internal")
                    return {
                        ...o,
                        internalSection: {
                            title: internalSection?.title || "",
                            value: internalSection?.value || "",
                        },
                    };
                if (field === "bottom")
                    return {
                        ...o,
                        bottomSection: {
                            title: bottomSection?.title || "",
                            value: bottomSection?.value || "",
                        },
                    };
                return o;
            })
        );
    };

    // Add location override (initialized directly with current Global SEO data)
    const addLocationOverride = (locationCode: string) => {
        if (!setLocationOverrides) return;
        const target = availableLocations.find(
            (l) => l.code.toLowerCase() === locationCode.toLowerCase()
        );
        if (!target) return;

        const newOverride: LocationSeoOverride = {
            locationKey: target.code.toLowerCase(),
            locationType: target.type,
            locationName: target.name,
            currency: target.currency || "INR",
            metaTitle: metaTitle || entityTitle || "",
            metaDescription: metaDescription || entityDescription || "",
            keywords: [...keywords],
            deliveryHighlight: `Available in ${target.name}`,
            canonicalUrl: buildDefaultCanonical(target.code.toLowerCase()),
            isIndexed: true,
            internalSection: {
                title: internalSection?.title || "",
                value: internalSection?.value || "",
            },
            bottomSection: {
                title: bottomSection?.title || "",
                value: bottomSection?.value || "",
            },
        };

        setLocationOverrides([...locationOverrides, newOverride]);
        setActiveTab(target.code.toLowerCase());
    };

    const addAllLocationOverrides = () => {
        if (!setLocationOverrides || unconfiguredLocations.length === 0) return;

        const newOverrides: LocationSeoOverride[] = unconfiguredLocations.map((target) => ({
            locationKey: target.code.toLowerCase(),
            locationType: target.type,
            locationName: target.name,
            currency: target.currency || "INR",
            metaTitle: metaTitle || entityTitle || "",
            metaDescription: metaDescription || entityDescription || "",
            keywords: [...keywords],
            deliveryHighlight: `Available in ${target.name}`,
            canonicalUrl: buildDefaultCanonical(target.code.toLowerCase()),
            isIndexed: true,
            internalSection: {
                title: internalSection?.title || "",
                value: internalSection?.value || "",
            },
            bottomSection: {
                title: bottomSection?.title || "",
                value: bottomSection?.value || "",
            },
        }));

        setLocationOverrides([...locationOverrides, ...newOverrides]);
        if (newOverrides.length > 0) {
            const first = newOverrides[0];
            if (first) setActiveTab(first.locationKey);
        }
    };

    const updateOverride = (locationKey: string, patch: Partial<LocationSeoOverride>) => {
        if (!setLocationOverrides) return;
        setLocationOverrides(
            locationOverrides.map((o) =>
                o.locationKey.toLowerCase() === locationKey.toLowerCase()
                    ? { ...o, ...patch }
                    : o
            )
        );
    };

    const removeOverride = (locationKey: string) => {
        if (!setLocationOverrides) return;
        setLocationOverrides(
            locationOverrides.filter((o) => o.locationKey.toLowerCase() !== locationKey.toLowerCase())
        );
        setActiveTab("GLOBAL");
    };

    // Computed SERP values based on current active tab
    const currentTitle =
        activeTab === "GLOBAL"
            ? metaTitle || entityTitle || "Product Title"
            : activeOverride?.metaTitle || metaTitle || entityTitle || "Product Title";

    const currentDescription =
        activeTab === "GLOBAL"
            ? metaDescription || entityDescription || "Discover our fresh culinary products with fast delivery."
            : activeOverride?.metaDescription || metaDescription || entityDescription || "Discover our fresh culinary products with fast delivery.";

    const simulatedPath =
        activeTab === "GLOBAL"
            ? getSimulatedPath()
            : getSimulatedPath(activeOverride?.locationKey, activeOverride?.locationType);

    const isFieldCustomized = (field: keyof LocationCustomizedFlags): boolean => {
        if (!activeOverride) return false;
        return Boolean(customizedFields[activeOverride.locationKey.toLowerCase()]?.[field]);
    };

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Search size={13} />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Search Engine Optimization (SEO)</span>
                            {locationOverrides.length > 0 && (
                                <Badge variant="neutral" size="sm">
                                    {locationOverrides.length} Localized {locationOverrides.length === 1 ? "Page" : "Pages"}
                                </Badge>
                            )}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Global search engine metadata synchronizes automatically to location pages while typing. Edit any location independently as needed.
                        </p>
                    </div>
                </div>

                {/* View Mode Toggle: Tabs vs Spreadsheet Matrix */}
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-neutral-800 p-0.5 bg-slate-50 dark:bg-neutral-900 text-xs">
                    <button
                        type="button"
                        onClick={() => setViewMode("tabs")}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${viewMode === "tabs"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 dark:text-neutral-400 hover:text-slate-800"
                            }`}
                    >
                        <LayoutList size={11} />
                        <span>Tabs</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("matrix")}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${viewMode === "matrix"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 dark:text-neutral-400 hover:text-slate-800"
                            }`}
                    >
                        <Table size={11} />
                        <span>Matrix View</span>
                    </button>
                </div>
            </div>

            {/* MATRIX / SPREADSHEET VIEW */}
            {viewMode === "matrix" && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300">
                            <Table size={13} className="text-blue-600" />
                            <span>
                                <strong>Multi-Location Matrix:</strong> Edit any location independently. Unedited fields inherit from Global.
                            </span>
                        </div>
                        {unconfiguredLocations.length > 0 && (
                            <button
                                type="button"
                                onClick={addAllLocationOverrides}
                                disabled={disabled}
                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <span>+ Add all remaining locations ({unconfiguredLocations.length})</span>
                            </button>
                        )}
                    </div>

                    {locationOverrides.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-neutral-800 rounded-lg">
                            <p className="text-xs text-slate-500 mb-2">No location overrides added yet.</p>
                            {unconfiguredLocations.length > 0 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={addAllLocationOverrides}
                                    className="gap-1 text-xs"
                                >
                                    <span>Add All Locations ({unconfiguredLocations.length})</span>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 dark:border-neutral-800 rounded-lg">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-neutral-900/90 border-b border-slate-200 dark:border-neutral-800 text-[11px] text-slate-600 dark:text-neutral-400 font-semibold">
                                        <th className="py-2 px-2.5 w-32">Location</th>
                                        <th className="py-2 px-2.5 min-w-[220px]">Localized Meta Title</th>
                                        <th className="py-2 px-2.5 min-w-[260px]">Localized Meta Description</th>
                                        <th className="py-2 px-2.5 min-w-[170px]">Delivery Badge</th>
                                        <th className="py-2 px-2.5 min-w-[140px]">Content Blocks</th>
                                        <th className="py-2 px-2 w-16 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                    {locationOverrides.map((override) => {
                                        const flags = customizedFields[override.locationKey.toLowerCase()] || {};
                                        const hasCustomInternal = Boolean(override.internalSection?.title || override.internalSection?.value);
                                        const hasCustomBottom = Boolean(override.bottomSection?.title || override.bottomSection?.value);
                                        return (
                                            <tr
                                                key={override.locationKey}
                                                className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                                            >
                                                <td className="py-2 px-2.5 align-top">
                                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                        <MapPin size={11} className="text-emerald-600 shrink-0" />
                                                        <span>{override.locationName}</span>
                                                    </div>
                                                    <Badge variant="neutral" size="sm" className="mt-0.5 text-[9px] px-1 py-0">
                                                        {override.locationType}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-2.5 align-top">
                                                    <input
                                                        type="text"
                                                        value={override.metaTitle || ""}
                                                        onChange={(e) => {
                                                            markLocationFieldCustomized(override.locationKey, "title");
                                                            updateOverride(override.locationKey, { metaTitle: e.target.value });
                                                        }}
                                                        placeholder="Enter meta title"
                                                        disabled={disabled}
                                                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                                    />
                                                    <div className="flex items-center justify-between mt-0.5 text-[9px] text-slate-400">
                                                        <span>{(override.metaTitle || "").length} / 60 chars</span>
                                                        {flags.title && (
                                                            <button
                                                                type="button"
                                                                onClick={() => resetLocationFieldToGlobal(override.locationKey, "title")}
                                                                className="text-blue-500 hover:underline"
                                                            >
                                                                Sync with Global
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2.5 align-top">
                                                    <textarea
                                                        rows={2}
                                                        value={override.metaDescription || ""}
                                                        onChange={(e) => {
                                                            markLocationFieldCustomized(override.locationKey, "desc");
                                                            updateOverride(override.locationKey, { metaDescription: e.target.value });
                                                        }}
                                                        placeholder="Enter meta description"
                                                        disabled={disabled}
                                                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-2.5 align-top">
                                                    <input
                                                        type="text"
                                                        value={override.deliveryHighlight || ""}
                                                        onChange={(e) => {
                                                            markLocationFieldCustomized(override.locationKey, "badge");
                                                            updateOverride(override.locationKey, {
                                                                deliveryHighlight: e.target.value,
                                                            });
                                                        }}
                                                        placeholder="Enter delivery highlight badge"
                                                        disabled={disabled}
                                                        className="w-full text-xs px-2 py-1 rounded border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                                    />
                                                </td>
                                                <td className="py-2 px-2.5 align-top">
                                                    <div className="flex flex-col gap-1 text-[10px]">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-slate-400">Body:</span>
                                                            {hasCustomInternal ? (
                                                                <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[90px]">
                                                                    {override.internalSection?.title || "Custom"}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Inherited</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-slate-400">Footer:</span>
                                                            {hasCustomBottom ? (
                                                                <span className="text-purple-600 dark:text-purple-400 font-medium truncate max-w-[90px]">
                                                                    {override.bottomSection?.title || "Custom"}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Inherited</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-center align-middle">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveTab(override.locationKey);
                                                                setViewMode("tabs");
                                                            }}
                                                            title="Focus in Tab View"
                                                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                                                        >
                                                            <ExternalLink size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOverride(override.locationKey)}
                                                            title="Remove location override"
                                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TABS VIEW */}
            {viewMode === "tabs" && (
                <div>
                    {/* Location Tabs Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b border-slate-100 dark:border-neutral-800/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab("GLOBAL")}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${activeTab === "GLOBAL"
                                ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                : "bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
                                }`}
                        >
                            <Globe size={12} />
                            <span>Global (Default)</span>
                        </button>

                        {locationOverrides.map((override) => {
                            const isActive = activeTab.toLowerCase() === override.locationKey.toLowerCase();
                            const flags = customizedFields[override.locationKey.toLowerCase()] || {};
                            const hasCustomization = flags.title || flags.desc || flags.keywords || flags.canonical;

                            return (
                                <button
                                    key={override.locationKey}
                                    type="button"
                                    onClick={() => setActiveTab(override.locationKey.toLowerCase())}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${isActive
                                        ? "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                                        : "bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
                                        }`}
                                >
                                    <MapPin size={11} />
                                    <span>{override.locationName}</span>
                                    {hasCustomization ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has independent overrides" />
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" title="Synced with Global" />
                                    )}
                                </button>
                            );
                        })}

                        {/* Add Location Override Selector */}
                        {setLocationOverrides && unconfiguredLocations.length > 0 && (
                            <div className="relative shrink-0 flex items-center gap-1.5">
                                <select
                                    onChange={(e) => {
                                        if (e.target.value === "__ALL__") {
                                            addAllLocationOverrides();
                                        } else if (e.target.value) {
                                            addLocationOverride(e.target.value);
                                        }
                                        e.target.value = "";
                                    }}
                                    defaultValue=""
                                    disabled={disabled}
                                    aria-label="Add location override"
                                    className="text-xs font-medium py-1 px-2.5 rounded-md border border-dashed border-slate-300 dark:border-neutral-700 bg-transparent text-slate-600 dark:text-neutral-400 hover:border-slate-400 dark:hover:border-neutral-600 cursor-pointer outline-none"
                                >
                                    <option value="" disabled>
                                        + Add Location Override
                                    </option>
                                    {unconfiguredLocations.length > 1 && (
                                        <option value="__ALL__" className="font-semibold text-blue-600 dark:text-blue-400">
                                            Add All Active Locations ({unconfiguredLocations.length})
                                        </option>
                                    )}
                                    {unconfiguredLocations.map((loc) => (
                                        <option key={loc.code} value={loc.code}>
                                            {loc.name} ({loc.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Google SERP Live Snippet Box */}
                    <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                                <Globe size={11} />
                                Google SERP Live Preview —{" "}
                                {activeTab === "GLOBAL"
                                    ? "Global Search Result"
                                    : `${activeOverride?.locationName} Landing`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
                                {simulatedPath}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-neutral-400 truncate">
                                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-neutral-300">
                                    S
                                </div>
                                <span className="font-medium text-slate-700 dark:text-neutral-300">yourstore.com</span>
                                <span>›</span>
                                <span className="text-slate-500 dark:text-neutral-400 truncate">{simulatedPath}</span>
                            </div>

                            <div className="text-[14px] leading-tight font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
                                {currentTitle}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-snug line-clamp-2">
                                {currentDescription}
                            </p>
                        </div>
                    </div>

                    {/* Active Content: GLOBAL Tab */}
                    {activeTab === "GLOBAL" && (
                        <div className="space-y-3.5">
                            {/* Meta Title */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label>Meta Title</Label>
                                    <span
                                        className={`text-[11px] font-mono ${metaTitle.length > 60
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
                                    onChange={(e) => handleGlobalTitleChange(e.target.value)}
                                    placeholder="Enter meta title"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Meta Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label>Meta Description</Label>
                                    <span
                                        className={`text-[11px] font-mono ${metaDescription.length > 160
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
                                    onChange={(e) => handleGlobalDescriptionChange(e.target.value)}
                                    placeholder="Enter meta description"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Keywords Tag Manager */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Label>Keywords</Label>
                                        {keywords.length > 0 && (
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                                                {keywords.length}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                        Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">Enter</kbd> or <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">,</kbd>
                                    </span>
                                </div>

                                <div
                                    onClick={() => keywordInputRef.current?.focus()}
                                    className={`min-h-[38px] px-2.5 py-1.5 rounded-md border flex flex-wrap items-center gap-1.5 transition-all cursor-text ${disabled
                                        ? "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                                        : "bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15"
                                        }`}
                                >
                                    {keywords.map((kw, idx) => (
                                        <span
                                            key={`${kw}-${idx}`}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80"
                                        >
                                            <span className="text-blue-400 dark:text-blue-500 select-none">#</span>
                                            <span>{kw}</span>
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeKeyword(idx);
                                                    }}
                                                    className="p-0.5 rounded hover:bg-blue-200/60 dark:hover:bg-blue-800/60 text-blue-500 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </span>
                                    ))}

                                    <div className="flex-1 min-w-[120px]">
                                        <input
                                            ref={keywordInputRef}
                                            type="text"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={handleKeywordKeyDown}
                                            placeholder={keywords.length === 0 ? "Enter keywords (press Enter or comma)..." : "Enter more keywords..."}
                                            disabled={disabled}
                                            className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 py-0.5"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Directives & Canonical URL */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <Label className="mb-1">Robots Directive</Label>
                                    <Select
                                        size="sm"
                                        value={metaRobots}
                                        onChange={(e) => setMetaRobots(e.target.value)}
                                        disabled={disabled}
                                        options={[
                                            { value: "index, follow", label: "index, follow (Standard)" },
                                            { value: "noindex, follow", label: "noindex, follow (Hide from search)" },
                                            { value: "index, nofollow", label: "index, nofollow (Index without link juice)" },
                                            { value: "noindex, nofollow", label: "noindex, nofollow (Complete block)" },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <Label>Canonical URL</Label>
                                        {categorySlug && (
                                            <span className="text-[10px] text-slate-400">Includes /{categorySlug}/</span>
                                        )}
                                    </div>
                                    <Input
                                        size="sm"
                                        value={canonicalUrl}
                                        onChange={(e) => handleGlobalCanonicalChange(e.target.value)}
                                        placeholder="Enter canonical URL"
                                        disabled={disabled}
                                    />
                                </div>
                            </div>

                            {/* Rich SEO Content Sections: Internal Section & Bottom Section */}
                            <div className="pt-2.5 space-y-3">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-neutral-800">
                                    <Sparkles size={13} className="text-amber-500" />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                        Rich SEO Content Blocks (In-Page Copy & Footer FAQs)
                                    </span>
                                </div>

                                <ContentSectionEditor
                                    titleLabel="Internal Content Section (SEO In-Body Text Block)"
                                    sectionType="internal"
                                    badgeText="Page Body SEO"
                                    description="Rich educational or product SEO text block rendered within page content for search bots and deep topical relevance."
                                    titleValue={internalSection?.title || ""}
                                    onTitleChange={(val) => handleGlobalInternalChange({ title: val })}
                                    titlePlaceholder="Enter internal section title"
                                    contentValue={internalSection?.value || ""}
                                    onContentChange={(val) => handleGlobalInternalChange({ value: val })}
                                    contentPlaceholder="Enter internal section content (HTML or plain text)"
                                    disabled={disabled}
                                />

                                <ContentSectionEditor
                                    titleLabel="Bottom Content Section (Footer SEO & FAQ Block)"
                                    sectionType="bottom"
                                    badgeText="Footer SEO & FAQs"
                                    description="Bottom-of-page long-form content, local FAQ blocks, and target keyword clusters."
                                    titleValue={bottomSection?.title || ""}
                                    onTitleChange={(val) => handleGlobalBottomChange({ title: val })}
                                    titlePlaceholder="Enter bottom section title"
                                    contentValue={bottomSection?.value || ""}
                                    onContentChange={(val) => handleGlobalBottomChange({ value: val })}
                                    contentPlaceholder="Enter bottom section content (HTML or plain text)"
                                    disabled={disabled}
                                />
                            </div>
                        </div>
                    )}

                    {/* Active Content: Location Override Tab */}
                    {activeTab !== "GLOBAL" && activeOverride && (
                        <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                            <span>Targeting {activeOverride.locationName} ({activeOverride.locationType})</span>
                                        </h3>
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                            Landing page URL:{" "}
                                            <code className="font-mono bg-emerald-100/70 dark:bg-emerald-900/50 px-1 py-0.5 rounded">
                                                /{simulatedPath}
                                            </code>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => removeOverride(activeOverride.locationKey)}
                                        disabled={disabled}
                                        className="h-7 text-[11px] gap-1"
                                    >
                                        <Trash2 size={11} />
                                        <span>Remove Override</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Local Meta Title */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Label>Localized Meta Title ({activeOverride.locationName})</Label>
                                        {isFieldCustomized("title") ? (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="warning" size="sm" className="text-[9px] px-1 py-0">
                                                    Customized
                                                </Badge>
                                                <button
                                                    type="button"
                                                    onClick={() => resetLocationFieldToGlobal(activeOverride.locationKey, "title")}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                                    title="Re-sync with Global Default"
                                                >
                                                    <RotateCcw size={10} /> Reset to Global
                                                </button>
                                            </div>
                                        ) : (
                                            <Badge variant="success" size="sm" className="text-[9px] px-1 py-0 flex items-center gap-0.5">
                                                <Link2 size={9} /> Synced with Global
                                            </Badge>
                                        )}
                                    </div>
                                    <span
                                        className={`text-[11px] font-mono ${(activeOverride.metaTitle || "").length > 60
                                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                                            : "text-slate-400 dark:text-neutral-500"
                                            }`}
                                    >
                                        {(activeOverride.metaTitle || "").length} / 60 chars
                                    </span>
                                </div>
                                <Input
                                    size="sm"
                                    value={activeOverride.metaTitle ?? metaTitle ?? ""}
                                    onChange={(e) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "title");
                                        updateOverride(activeOverride.locationKey, { metaTitle: e.target.value });
                                    }}
                                    placeholder="Enter localized meta title"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Local Meta Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Label>Localized Meta Description</Label>
                                        {isFieldCustomized("desc") ? (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="warning" size="sm" className="text-[9px] px-1 py-0">
                                                    Customized
                                                </Badge>
                                                <button
                                                    type="button"
                                                    onClick={() => resetLocationFieldToGlobal(activeOverride.locationKey, "desc")}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                                >
                                                    <RotateCcw size={10} /> Reset to Global
                                                </button>
                                            </div>
                                        ) : (
                                            <Badge variant="success" size="sm" className="text-[9px] px-1 py-0 flex items-center gap-0.5">
                                                <Link2 size={9} /> Synced with Global
                                            </Badge>
                                        )}
                                    </div>
                                    <span
                                        className={`text-[11px] font-mono ${(activeOverride.metaDescription || "").length > 160
                                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                                            : "text-slate-400 dark:text-neutral-500"
                                            }`}
                                    >
                                        {(activeOverride.metaDescription || "").length} / 160 chars
                                    </span>
                                </div>
                                <Textarea
                                    rows={2}
                                    value={activeOverride.metaDescription ?? metaDescription ?? ""}
                                    onChange={(e) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "desc");
                                        updateOverride(activeOverride.locationKey, { metaDescription: e.target.value });
                                    }}
                                    placeholder="Enter localized meta description"
                                    disabled={disabled}
                                />
                            </div>

                            {/* Delivery Highlight & Local Canonical */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="mb-1">Delivery Highlight Badge</Label>
                                    <Input
                                        size="sm"
                                        value={activeOverride.deliveryHighlight || ""}
                                        onChange={(e) => {
                                            markLocationFieldCustomized(activeOverride.locationKey, "badge");
                                            updateOverride(activeOverride.locationKey, {
                                                deliveryHighlight: e.target.value,
                                            });
                                        }}
                                        placeholder="Enter delivery highlight badge"
                                        disabled={disabled}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <Label>Local Canonical URL</Label>
                                        {categorySlug && (
                                            <span className="text-[10px] text-slate-400">Includes /{categorySlug}/</span>
                                        )}
                                    </div>
                                    <Input
                                        size="sm"
                                        value={activeOverride.canonicalUrl || ""}
                                        onChange={(e) => {
                                            markLocationFieldCustomized(activeOverride.locationKey, "canonical");
                                            updateOverride(activeOverride.locationKey, {
                                                canonicalUrl: e.target.value,
                                            });
                                        }}
                                        placeholder="Enter local canonical URL"
                                        disabled={disabled}
                                    />
                                </div>
                            </div>

                            {/* Local Keywords */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Label>Local Keywords ({activeOverride.locationName})</Label>
                                        {isFieldCustomized("keywords") && (
                                            <button
                                                type="button"
                                                onClick={() => resetLocationFieldToGlobal(activeOverride.locationKey, "keywords")}
                                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                            >
                                                <RotateCcw size={10} /> Reset to Global
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                        Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200">Enter</kbd>
                                    </span>
                                </div>

                                <div
                                    onClick={() => keywordInputRef.current?.focus()}
                                    className="min-h-[38px] px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex flex-wrap items-center gap-1.5 cursor-text"
                                >
                                    {(activeOverride.keywords && activeOverride.keywords.length > 0
                                        ? activeOverride.keywords
                                        : keywords
                                    ).map((kw, idx) => (
                                        <span
                                            key={`${kw}-${idx}`}
                                            className="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                        >
                                            <span>#{kw}</span>
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeKeyword(idx);
                                                    }}
                                                    className="p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-600 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </span>
                                    ))}

                                    <div className="flex-1 min-w-[120px]">
                                        <input
                                            ref={keywordInputRef}
                                            type="text"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={handleKeywordKeyDown}
                                            placeholder="Enter local keyword and press Enter..."
                                            disabled={disabled}
                                            className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 py-0.5"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Localized Rich SEO Content Sections */}
                            <div className="pt-2.5 space-y-3">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-neutral-800">
                                    <Sparkles size={13} className="text-emerald-500" />
                                    <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                        Localized Rich Content Sections ({activeOverride.locationName})
                                    </span>
                                </div>

                                <ContentSectionEditor
                                    titleLabel={`Localized Internal Content (${activeOverride.locationName})`}
                                    sectionType="internal"
                                    badgeText="Page Body SEO"
                                    description={`In-body SEO content block specifically for ${activeOverride.locationName}. Inherits Global content unless customized.`}
                                    titleValue={activeOverride.internalSection?.title ?? internalSection?.title ?? ""}
                                    onTitleChange={(val) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "internal");
                                        updateOverride(activeOverride.locationKey, {
                                            internalSection: {
                                                title: val,
                                                value: activeOverride.internalSection?.value ?? internalSection?.value ?? "",
                                            },
                                        });
                                    }}
                                    contentValue={activeOverride.internalSection?.value ?? internalSection?.value ?? ""}
                                    onContentChange={(val) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "internal");
                                        updateOverride(activeOverride.locationKey, {
                                            internalSection: {
                                                title: activeOverride.internalSection?.title ?? internalSection?.title ?? "",
                                                value: val,
                                            },
                                        });
                                    }}
                                    titlePlaceholder="Enter localized internal section title"
                                    contentPlaceholder="Enter localized internal section content (HTML or plain text)"
                                    isCustomized={Boolean(customizedFields[activeOverride.locationKey.toLowerCase()]?.internal)}
                                    onResetToGlobal={() => resetLocationFieldToGlobal(activeOverride.locationKey, "internal")}
                                    disabled={disabled}
                                />

                                <ContentSectionEditor
                                    titleLabel={`Localized Bottom Content (${activeOverride.locationName})`}
                                    sectionType="bottom"
                                    badgeText="Footer SEO & FAQs"
                                    description={`Bottom-of-page content block and FAQs for ${activeOverride.locationName}. Inherits Global content unless customized.`}
                                    titleValue={activeOverride.bottomSection?.title ?? bottomSection?.title ?? ""}
                                    onTitleChange={(val) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "bottom");
                                        updateOverride(activeOverride.locationKey, {
                                            bottomSection: {
                                                title: val,
                                                value: activeOverride.bottomSection?.value ?? bottomSection?.value ?? "",
                                            },
                                        });
                                    }}
                                    contentValue={activeOverride.bottomSection?.value ?? bottomSection?.value ?? ""}
                                    onContentChange={(val) => {
                                        markLocationFieldCustomized(activeOverride.locationKey, "bottom");
                                        updateOverride(activeOverride.locationKey, {
                                            bottomSection: {
                                                title: activeOverride.bottomSection?.title ?? bottomSection?.title ?? "",
                                                value: val,
                                            },
                                        });
                                    }}
                                    titlePlaceholder="Enter localized bottom section title"
                                    contentPlaceholder="Enter localized bottom section content (HTML or plain text)"
                                    isCustomized={Boolean(customizedFields[activeOverride.locationKey.toLowerCase()]?.bottom)}
                                    onResetToGlobal={() => resetLocationFieldToGlobal(activeOverride.locationKey, "bottom")}
                                    disabled={disabled}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
