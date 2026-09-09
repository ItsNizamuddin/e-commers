"use client";

import React, { useState, useRef } from "react";
import type { LocationSeoOverride } from "@ecommers/types";
import { Card, Badge, Input, Select, Textarea, Label, Button } from "@ecommers/ui";
import {
    Search,
    Globe,
    MapPin,
    Plus,
    Trash2,
    Sparkles,
    X,
    ExternalLink,
    ChevronRight,
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

    // Location SEO overrides
    locationOverrides?: LocationSeoOverride[];
    setLocationOverrides?: (overrides: LocationSeoOverride[]) => void;
    availableLocations?: AvailableLocationOption[];

    disabled?: boolean;
}

export function GenericSeoCard({
    entityTitle,
    entitySlug,
    entityDescription = "",
    routePrefix = "products",
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
    locationOverrides = [],
    setLocationOverrides,
    availableLocations = [],
    disabled = false,
}: GenericSeoCardProps) {
    // Active tab: "GLOBAL" or locationKey
    const [activeTab, setActiveTab] = useState<string>("GLOBAL");
    const [keywordInput, setKeywordInput] = useState("");
    const keywordInputRef = useRef<HTMLInputElement>(null);

    // Filter available locations that aren't yet in overrides
    const unconfiguredLocations = availableLocations.filter(
        (loc) => !locationOverrides.some((o) => o.locationKey.toLowerCase() === loc.code.toLowerCase())
    );

    // Active location override if not GLOBAL
    const activeOverride = activeTab !== "GLOBAL"
        ? locationOverrides.find((o) => o.locationKey.toLowerCase() === activeTab.toLowerCase())
        : null;

    // Helper to add keyword to global or active override
    const addKeywords = (rawKeywords: string[]) => {
        const cleaned = rawKeywords
            .map((k) => k.trim().replace(/^#+/, ""))
            .filter((k) => k.length > 0);

        if (cleaned.length === 0) return;

        if (activeTab === "GLOBAL") {
            const existingLower = new Set(keywords.map((k) => k.toLowerCase()));
            const uniqueNew = cleaned.filter((k) => !existingLower.has(k.toLowerCase()));
            if (uniqueNew.length > 0) {
                setKeywords([...keywords, ...uniqueNew]);
            }
        } else if (activeOverride && setLocationOverrides) {
            const currentList = activeOverride.keywords || [];
            const existingLower = new Set(currentList.map((k) => k.toLowerCase()));
            const uniqueNew = cleaned.filter((k) => !existingLower.has(k.toLowerCase()));
            if (uniqueNew.length > 0) {
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
                setKeywords(keywords.slice(0, -1));
            } else if (activeOverride && activeOverride.keywords && activeOverride.keywords.length > 0) {
                updateOverride(activeOverride.locationKey, {
                    keywords: activeOverride.keywords.slice(0, -1),
                });
            }
        }
    };

    const removeKeyword = (idx: number) => {
        if (disabled) return;
        if (activeTab === "GLOBAL") {
            setKeywords(keywords.filter((_, i) => i !== idx));
        } else if (activeOverride && setLocationOverrides) {
            updateOverride(activeOverride.locationKey, {
                keywords: (activeOverride.keywords || []).filter((_, i) => i !== idx),
            });
        }
    };

    // Override management
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
            ...(target.currency ? { currency: target.currency } : {}),
            metaTitle: entityTitle ? `${entityTitle} in ${target.name} | Fast Delivery` : "",
            metaDescription: entityTitle
                ? `Order fresh ${entityTitle} online in ${target.name}. Guaranteed authentic taste and express delivery in ${target.name}.`
                : "",
            keywords: keywords.length > 0 ? keywords.map((k) => `${k} ${target.name.toLowerCase()}`) : [],
            deliveryHighlight: `Available in ${target.name}`,
            isIndexed: true,
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
            ...(target.currency ? { currency: target.currency } : {}),
            metaTitle: entityTitle ? `${entityTitle} in ${target.name} | Fast Delivery` : "",
            metaDescription: entityTitle
                ? `Order fresh ${entityTitle} online in ${target.name}. Guaranteed authentic taste and express delivery in ${target.name}.`
                : "",
            keywords: keywords.length > 0 ? keywords.map((k) => `${k} ${target.name.toLowerCase()}`) : [],
            deliveryHighlight: `Available in ${target.name}`,
            isIndexed: true,
        }));

        setLocationOverrides([...locationOverrides, ...newOverrides]);
        if (newOverrides.length > 0) {
            setActiveTab(newOverrides[0].locationKey);
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

    // Quick auto-generate helpers
    const autoGenerateGlobal = () => {
        if (!entityTitle) return;
        setMetaTitle(`${entityTitle} | Buy Online at Best Price`);
        if (entityDescription) {
            const snippet = entityDescription.slice(0, 140).trim();
            setMetaDescription(snippet + (snippet.endsWith(".") ? "" : ". Free express shipping available."));
        } else {
            setMetaDescription(`Order authentic ${entityTitle} online. Hand-crafted with premium ingredients, delivered fresh to your door.`);
        }
    };

    const autoGenerateLocal = () => {
        if (!activeOverride || !entityTitle) return;
        const loc = activeOverride.locationName;
        updateOverride(activeOverride.locationKey, {
            metaTitle: `${entityTitle} in ${loc} | Authentic & Fresh Delivery`,
            metaDescription: `Buy fresh ${entityTitle} in ${loc}. Delivered with express doorstep shipping across ${loc}. Order online today!`,
            deliveryHighlight: `Next-day delivery available across ${loc}`,
        });
    };

    // Computed SERP values based on current active tab
    const currentTitle = activeTab === "GLOBAL"
        ? (metaTitle || entityTitle || "Product Title")
        : (activeOverride?.metaTitle || `${entityTitle} in ${activeOverride?.locationName || ""}`);

    const currentDescription = activeTab === "GLOBAL"
        ? (metaDescription || entityDescription || "Discover our fresh, high quality culinary products with fast doorstep delivery.")
        : (activeOverride?.metaDescription || `Order authentic ${entityTitle} delivered fresh to your doorstep in ${activeOverride?.locationName || ""}.`);

    // Simulated URL display
    const simulatedPath = activeTab === "GLOBAL"
        ? `${routePrefix}/${entitySlug || "item-slug"}`
        : activeOverride?.locationType === "COUNTRY"
        ? `${activeOverride.locationKey}/${routePrefix}/${entitySlug || "item-slug"}`
        : `${routePrefix}/${entitySlug || "item-slug"}/${activeOverride?.locationKey || "city"}`;

    const currentKeywords = activeTab === "GLOBAL" ? keywords : (activeOverride?.keywords || []);

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            {/* Header */}
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
                            Configure global search indexing and localized multi-city/country search landing pages.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {locationOverrides.length > 0 && (
                        <Badge variant="neutral" size="sm">
                            {locationOverrides.length} Localized {locationOverrides.length === 1 ? "Page" : "Pages"}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Location Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b border-slate-100 dark:border-neutral-800/80">
                <button
                    type="button"
                    onClick={() => setActiveTab("GLOBAL")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        activeTab === "GLOBAL"
                            ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            : "bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
                    }`}
                >
                    <Globe size={12} />
                    <span>Global (Default)</span>
                </button>

                {locationOverrides.map((override) => {
                    const isActive = activeTab.toLowerCase() === override.locationKey.toLowerCase();
                    return (
                        <button
                            key={override.locationKey}
                            type="button"
                            onClick={() => setActiveTab(override.locationKey.toLowerCase())}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                                isActive
                                    ? "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                                    : "bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-800"
                            }`}
                        >
                            <MapPin size={11} />
                            <span>{override.locationName}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 dark:bg-emerald-400" />
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
                            <option value="" disabled>+ Add Location Override</option>
                            {unconfiguredLocations.length > 1 && (
                                <option value="__ALL__" className="font-semibold text-blue-600 dark:text-blue-400">
                                    ⚡ Add All Active Locations ({unconfiguredLocations.length})
                                </option>
                            )}
                            {unconfiguredLocations.map((loc) => (
                                <option key={loc.code} value={loc.code}>
                                    {loc.name} ({loc.type})
                                </option>
                            ))}
                        </select>

                        {/* Quick 1-click button to generate for all locations */}
                        {unconfiguredLocations.length > 1 && (
                            <button
                                type="button"
                                onClick={addAllLocationOverrides}
                                disabled={disabled}
                                title="Generate SEO landing overrides for all remaining locations at once"
                                className="text-xs font-semibold py-1 px-2.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            >
                                <Sparkles size={11} />
                                <span>Add All ({unconfiguredLocations.length})</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Google SERP Live Snippet Box */}
            <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 flex items-center gap-1">
                        <Globe size={11} />
                        Google SERP Live Preview — {activeTab === "GLOBAL" ? "Global Search Result" : `${activeOverride?.locationName} Landing`}
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
                            <div className="flex items-center gap-2">
                                <Label>Meta Title</Label>
                                <button
                                    type="button"
                                    onClick={autoGenerateGlobal}
                                    disabled={disabled || !entityTitle}
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-40"
                                >
                                    <Sparkles size={10} /> Auto-Generate
                                </button>
                            </div>
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
                            placeholder={entityTitle ? `${entityTitle} | Buy Online` : "e.g. Avissa Ginjala Laddu | Traditional Sweets"}
                            disabled={disabled}
                        />
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
                            placeholder="Enter a compelling summary that encourages shoppers to click from Google results..."
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
                            className={`min-h-[38px] px-2.5 py-1.5 rounded-md border flex flex-wrap items-center gap-1.5 transition-all cursor-text ${
                                disabled
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
                                    placeholder={keywords.length === 0 ? "Type keyword & Enter..." : "Add more..."}
                                    disabled={disabled}
                                    className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 py-0.5"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Directives & Canonical */}
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
                            <Label className="mb-1">Canonical URL</Label>
                            <Input
                                size="sm"
                                value={canonicalUrl}
                                onChange={(e) => setCanonicalUrl(e.target.value)}
                                placeholder="https://yourstore.com/products/..."
                                disabled={disabled}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Active Content: Location Override Tab */}
            {activeTab !== "GLOBAL" && activeOverride && (
                <div className="space-y-3.5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                                    Targeting {activeOverride.locationName} ({activeOverride.locationType})
                                </h3>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    Unique landing page at <code className="font-mono bg-emerald-100/70 dark:bg-emerald-900/50 px-1 py-0.5 rounded">/{simulatedPath}</code>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={autoGenerateLocal}
                                disabled={disabled}
                                className="h-7 text-[11px] gap-1 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-700"
                            >
                                <Sparkles size={11} />
                                <span>Auto-Fill for {activeOverride.locationName}</span>
                            </Button>

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
                            <Label>Localized Meta Title ({activeOverride.locationName})</Label>
                            <span
                                className={`text-[11px] font-mono ${
                                    (activeOverride.metaTitle || "").length > 60
                                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                                        : "text-slate-400 dark:text-neutral-500"
                                }`}
                            >
                                {(activeOverride.metaTitle || "").length} / 60 chars
                            </span>
                        </div>
                        <Input
                            size="sm"
                            value={activeOverride.metaTitle || ""}
                            onChange={(e) =>
                                updateOverride(activeOverride.locationKey, { metaTitle: e.target.value })
                            }
                            placeholder={`${entityTitle || "Product"} in ${activeOverride.locationName} | Fast Delivery`}
                            disabled={disabled}
                        />
                    </div>

                    {/* Local Meta Description */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Label>Localized Meta Description</Label>
                            <span
                                className={`text-[11px] font-mono ${
                                    (activeOverride.metaDescription || "").length > 160
                                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                                        : "text-slate-400 dark:text-neutral-500"
                                }`}
                            >
                                {(activeOverride.metaDescription || "").length} / 160 chars
                            </span>
                        </div>
                        <Textarea
                            rows={2}
                            value={activeOverride.metaDescription || ""}
                            onChange={(e) =>
                                updateOverride(activeOverride.locationKey, { metaDescription: e.target.value })
                            }
                            placeholder={`Buy fresh ${entityTitle || "Product"} in ${activeOverride.locationName} with fast delivery...`}
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
                                onChange={(e) =>
                                    updateOverride(activeOverride.locationKey, {
                                        deliveryHighlight: e.target.value,
                                    })
                                }
                                placeholder={`e.g. Express 24h delivery in ${activeOverride.locationName}`}
                                disabled={disabled}
                            />
                        </div>
                        <div>
                            <Label className="mb-1">Local Canonical URL (Optional)</Label>
                            <Input
                                size="sm"
                                value={activeOverride.canonicalUrl || ""}
                                onChange={(e) =>
                                    updateOverride(activeOverride.locationKey, {
                                        canonicalUrl: e.target.value,
                                    })
                                }
                                placeholder={`https://yourstore.com/${simulatedPath}`}
                                disabled={disabled}
                            />
                        </div>
                    </div>

                    {/* Local Keywords */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <Label>Local Keywords ({activeOverride.locationName})</Label>
                            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-neutral-800 border border-slate-200">Enter</kbd>
                            </span>
                        </div>

                        <div
                            onClick={() => keywordInputRef.current?.focus()}
                            className="min-h-[38px] px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex flex-wrap items-center gap-1.5 cursor-text"
                        >
                            {(activeOverride.keywords || []).map((kw, idx) => (
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
                                    placeholder={
                                        (activeOverride.keywords || []).length === 0
                                            ? `Add local keyword for ${activeOverride.locationName}...`
                                            : "Add another..."
                                    }
                                    disabled={disabled}
                                    className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 py-0.5"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
