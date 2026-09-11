"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import type {
    ProductResponse,
    CategoryResponse,
    LocationResponse,
    CreateProductInput,
    UpdateProductInput,
    ProductVariantInput,
    LocationSeoOverride,
    ISeoContentSection,
    WeightUnit,
    ProductStatus,
    CustomNutrient,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Select,
    Textarea,
    Label,
    ConfirmDialog,
} from "@ecommers/ui";
import {
    ArrowLeft,
    ArrowRight,
    Package,
    Save,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Layers,
    MapPin,
    Utensils,
    ChevronDown,
    ChevronUp,
    Globe,
    Plus,
    X,
    Sparkles,
} from "lucide-react";
import { ImageGalleryManager } from "../media/image-gallery-manager";
import { VariantMatrixManager } from "./variant-matrix-manager";
import { GenericSeoCard, AvailableLocationOption } from "../seo/generic-seo-card";
import { GenericSocialCard } from "../seo/generic-social-card";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const COMMON_DIETARY_TAGS = [
    "Veg (Pure Vegetarian)",
    "Non-Veg",
    "Eggless",
    "Pure Desi Ghee",
    "Jain (No Onion/Garlic)",
    "Halal",
    "Gluten-Free",
    "Organic",
    "Sugar-Free",
];

const COMMON_NUTRIENT_PRESETS = [
    { name: "Dietary Fiber", unit: "g", defaultAmount: 4.5 },
    { name: "Total Sugars", unit: "g", defaultAmount: 12 },
    { name: "Added Sugars", unit: "g", defaultAmount: 0 },
    { name: "Sodium", unit: "mg", defaultAmount: 110 },
    { name: "Saturated Fat", unit: "g", defaultAmount: 2 },
    { name: "Trans Fat", unit: "g", defaultAmount: 0 },
    { name: "Cholesterol", unit: "mg", defaultAmount: 0 },
    { name: "Calcium", unit: "mg", defaultAmount: 80 },
    { name: "Iron", unit: "mg", defaultAmount: 1.5 },
    { name: "Potassium", unit: "mg", defaultAmount: 200 },
    { name: "Vitamin C", unit: "mg", defaultAmount: 10 },
    { name: "Vitamin D", unit: "mcg", defaultAmount: 5 },
];

export interface ProductFormProps {
    mode: "create" | "edit";
    initialProduct?: ProductResponse | null;
    categories: CategoryResponse[];
    locations: LocationResponse[];
    onSubmit: (payload: CreateProductInput | UpdateProductInput) => Promise<void>;
    isSubmitting: boolean;
    onDelete?: () => Promise<void>;
    isDeleting?: boolean;
    errorMessage?: string | null;
    saveNotice?: string | null;
}

export function ProductForm({
    mode,
    initialProduct,
    categories,
    locations,
    onSubmit,
    isSubmitting,
    onDelete,
    isDeleting = false,
    errorMessage,
    saveNotice,
}: ProductFormProps) {
    const router = useRouter();

    // Basic Product Fields
    const [title, setTitle] = useState(initialProduct?.title || "");
    const [slug, setSlug] = useState(initialProduct?.slug || "");
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(initialProduct));
    const [brand, setBrand] = useState(initialProduct?.brand || "");
    const [categoryId, setCategoryId] = useState(
        initialProduct?.categoryId || (categories.length > 0 ? categories[0].id : "")
    );
    const [status, setStatus] = useState<ProductStatus>(initialProduct?.status || "PUBLISHED");
    const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription || "");
    const [description, setDescription] = useState(initialProduct?.description || "");
    const [tags, setTags] = useState<string[]>(initialProduct?.tags || []);
    const [tagInput, setTagInput] = useState("");

    // Serviceable Delivery Locations
    const initialLocations = initialProduct?.serviceableLocations || ["ALL"];
    const [isAllLocations, setIsAllLocations] = useState(initialLocations.includes("ALL"));
    const [selectedLocations, setSelectedLocations] = useState<string[]>(
        initialLocations.filter((l) => l !== "ALL")
    );

    // Media
    const [images, setImages] = useState<string[]>(initialProduct?.images || []);
    const [thumbnail, setThumbnail] = useState(initialProduct?.thumbnail || "");

    // Variants & Pack Sizes
    const [variants, setVariants] = useState<ProductVariantInput[]>(() => {
        if (initialProduct?.variants && initialProduct.variants.length > 0) {
            return initialProduct.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                title: v.title,
                weight: v.weight,
                weightUnit: v.weightUnit as WeightUnit,
                initialStock: (v as any).initialStock ?? (v as any).stock ?? 0,
                isActive: v.isActive,
                prices: v.prices.map((p) => ({
                    currency: p.currency,
                    amount: p.amount,
                    ...(p.compareAtAmount !== undefined ? { compareAtAmount: p.compareAtAmount } : {}),
                })),
                attributes: v.attributes,
            }));
        }
        return [];
    });

    // Food & Dietary Specs
    const [isSpecsOpen, setIsSpecsOpen] = useState(false);
    const [storageInstructions, setStorageInstructions] = useState(initialProduct?.storageInstructions || "");
    const [allergens, setAllergens] = useState((initialProduct?.allergens || []).join(", "));
    const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>(() => {
        const productTags = initialProduct?.tags || [];
        return COMMON_DIETARY_TAGS.filter((t) => productTags.includes(t));
    });
    const [servingSize, setServingSize] = useState(initialProduct?.nutritionInfo?.servingSize || "");
    const [calories, setCalories] = useState(
        initialProduct?.nutritionInfo?.calories ? String(initialProduct.nutritionInfo.calories) : ""
    );
    const [protein, setProtein] = useState(
        initialProduct?.nutritionInfo?.protein ? String(initialProduct.nutritionInfo.protein) : ""
    );
    const [carbs, setCarbs] = useState(
        initialProduct?.nutritionInfo?.carbohydrates ? String(initialProduct.nutritionInfo.carbohydrates) : ""
    );
    const [fat, setFat] = useState(
        initialProduct?.nutritionInfo?.fat ? String(initialProduct.nutritionInfo.fat) : ""
    );
    const [customNutrients, setCustomNutrients] = useState<CustomNutrient[]>(() => {
        const existing = initialProduct?.nutritionInfo?.customNutrients;
        if (existing && Array.isArray(existing)) {
            return existing.map((n) => ({ ...n, id: n.id || `nutr-${Math.random().toString(36).substring(2, 8)}` }));
        }
        // Also check if fiber or sodium was provided on the root nutritionInfo
        const initialNutrients: CustomNutrient[] = [];
        if (initialProduct?.nutritionInfo?.fiber) {
            initialNutrients.push({ id: "init-fiber", name: "Dietary Fiber", amount: initialProduct.nutritionInfo.fiber, unit: "g" });
        }
        if (initialProduct?.nutritionInfo?.sodium) {
            initialNutrients.push({ id: "init-sodium", name: "Sodium", amount: initialProduct.nutritionInfo.sodium, unit: "mg" });
        }
        if (initialProduct?.nutritionInfo?.sugar) {
            initialNutrients.push({ id: "init-sugar", name: "Total Sugars", amount: initialProduct.nutritionInfo.sugar, unit: "g" });
        }
        return initialNutrients;
    });

    const handleAddPresetNutrient = (preset: { name: string; unit: string; defaultAmount: number }) => {
        if (customNutrients.some((n) => n.name.toLowerCase() === preset.name.toLowerCase())) {
            return;
        }
        setCustomNutrients((prev) => [
            ...prev,
            {
                id: `nutr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: preset.name,
                amount: preset.defaultAmount,
                unit: preset.unit,
            },
        ]);
    };

    const handleAddCustomNutrient = () => {
        setCustomNutrients((prev) => [
            ...prev,
            {
                id: `nutr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: "",
                amount: "",
                unit: "g",
            },
        ]);
    };

    const handleUpdateCustomNutrient = (index: number, patch: Partial<CustomNutrient>) => {
        setCustomNutrients((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
        );
    };

    const handleRemoveCustomNutrient = (index: number) => {
        setCustomNutrients((prev) => prev.filter((_, i) => i !== index));
    };

    // Global SEO
    const [metaTitle, setMetaTitle] = useState(initialProduct?.seo?.metaTitle || "");
    const [metaDescription, setMetaDescription] = useState(initialProduct?.seo?.metaDescription || "");
    const [keywords, setKeywords] = useState<string[]>(initialProduct?.seo?.keywords || []);
    const [metaRobots, setMetaRobots] = useState(initialProduct?.seo?.metaRobots || "index, follow");
    const [canonicalUrl, setCanonicalUrl] = useState(initialProduct?.seo?.canonicalUrl || "");

    // Location SEO Overrides
    const [locationOverrides, setLocationOverrides] = useState<LocationSeoOverride[]>(
        initialProduct?.seo?.locations || []
    );

    // Rich SEO Content Sections
    const [internalSection, setInternalSection] = useState<ISeoContentSection>(
        initialProduct?.seo?.internalSection || { title: "", value: "" }
    );
    const [bottomSection, setBottomSection] = useState<ISeoContentSection>(
        initialProduct?.seo?.bottomSection || { title: "", value: "" }
    );

    // Social Sharing Card
    const [ogTitle, setOgTitle] = useState(initialProduct?.seo?.ogTitle || "");
    const [ogDescription, setOgDescription] = useState(initialProduct?.seo?.ogDescription || "");
    const [ogImage, setOgImage] = useState(initialProduct?.seo?.ogImage || "");

    // Local Validation Error
    const [localError, setLocalError] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    // Handle Title & Auto-Slug
    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!isSlugManuallyEdited) {
            setSlug(slugify(val));
        }
    };

    const handleSlugChange = (val: string) => {
        setIsSlugManuallyEdited(true);
        setSlug(slugify(val));
    };

    // Location Selection Handlers
    const handleToggleAllLocations = (checked: boolean) => {
        setIsAllLocations(checked);
        if (checked) {
            setSelectedLocations([]);
        }
    };

    const handleToggleLocationCode = (code: string) => {
        setIsAllLocations(false);
        const upper = code.toUpperCase();
        setSelectedLocations((prev) =>
            prev.includes(upper) ? prev.filter((c) => c !== upper) : [...prev, upper]
        );
    };

    // Tag management
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const trimmed = tagInput.trim().replace(/^#+/, "");
            if (trimmed && !tags.includes(trimmed)) {
                setTags([...tags, trimmed]);
                setTagInput("");
            }
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    // Available locations mapped for GenericSeoCard
    const availableLocationOptions: AvailableLocationOption[] = locations.map((loc) => ({
        code: loc.code,
        name: loc.name,
        type: loc.type,
        currency: loc.currency,
    }));

    // Form Submission
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!title.trim()) {
            setLocalError("Product title is required.");
            return;
        }

        if (!categoryId) {
            setLocalError("Please select a category.");
            return;
        }

        if (variants.length === 0) {
            setLocalError("At least one product variant / pack size is required.");
            return;
        }

        // Validate variants
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            if (!v.title.trim()) {
                setLocalError(`Variant #${i + 1} must have a pack title (e.g. 500 g).`);
                return;
            }
            if (!v.prices || v.prices.length === 0 || v.prices.some((p) => isNaN(p.amount) || p.amount < 0)) {
                setLocalError(`Variant "${v.title}" must have valid pricing tiers.`);
                return;
            }
        }

        // Serviceable locations
        const serviceableLocationsPayload = isAllLocations || selectedLocations.length === 0
            ? ["ALL"]
            : selectedLocations;

        // Allergens array
        const allergenList = allergens
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);

        // Nutrition info
        const validCustomNutrients = customNutrients
            .filter((n) => n.name.trim())
            .map((n) => ({
                name: n.name.trim(),
                amount: typeof n.amount === "string" ? parseFloat(n.amount) || n.amount : n.amount,
                unit: n.unit?.trim() || "g",
            }));

        const nutrition = (calories || protein || carbs || fat || servingSize || validCustomNutrients.length > 0)
            ? {
                  ...(servingSize.trim() ? { servingSize: servingSize.trim() } : {}),
                  ...(calories ? { calories: parseFloat(calories) } : {}),
                  ...(protein ? { protein: parseFloat(protein) } : {}),
                  ...(carbs ? { carbohydrates: parseFloat(carbs) } : {}),
                  ...(fat ? { fat: parseFloat(fat) } : {}),
                  ...(validCustomNutrients.length > 0 ? { customNutrients: validCustomNutrients } : {}),
              }
            : undefined;

        // Merge tags with selected dietary tags
        const combinedTags = Array.from(new Set([...tags, ...selectedDietaryTags]));

        // SEO metadata
        const seoPayload = {
            ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
            ...(metaDescription.trim() ? { metaDescription: metaDescription.trim() } : {}),
            ...(keywords.length > 0 ? { keywords } : {}),
            metaRobots: metaRobots || "index, follow",
            ...(canonicalUrl.trim() ? { canonicalUrl: canonicalUrl.trim() } : {}),
            ...(ogTitle.trim() ? { ogTitle: ogTitle.trim() } : {}),
            ...(ogDescription.trim() ? { ogDescription: ogDescription.trim() } : {}),
            ...(ogImage.trim() ? { ogImage: ogImage.trim() } : {}),
            ...(internalSection?.title?.trim() || internalSection?.value?.trim() ? { internalSection } : {}),
            ...(bottomSection?.title?.trim() || bottomSection?.value?.trim() ? { bottomSection } : {}),
            ...(locationOverrides.length > 0 ? { locations: locationOverrides } : {}),
        };
        const hasAnySeo = Object.keys(seoPayload).length > 0;

        // Sanitize variants & prices to match API schemas
        const sanitizedVariants = variants.map((v) => ({
            ...v,
            sku: v.sku.trim().toUpperCase(),
            title: v.title.trim(),
            weight: typeof v.weight === "string" ? parseFloat(v.weight) || undefined : v.weight,
            initialStock: typeof v.initialStock === "string" ? parseInt(v.initialStock, 10) || 0 : (v.initialStock ?? 0),
            prices: v.prices.map((p) => {
                const rawAmt = (p as any).amount;
                const amt = typeof rawAmt === "string" ? parseFloat(rawAmt) || 0 : (rawAmt ?? 0);
                const rawComp = (p as any).compareAtAmount;
                const comp = typeof rawComp === "string"
                    ? (rawComp.trim() ? parseFloat(rawComp) : undefined)
                    : typeof rawComp === "number"
                    ? rawComp
                    : undefined;
                return {
                    currency: (p.currency || "USD").trim().toUpperCase(),
                    amount: isNaN(amt) || amt < 0 ? 0 : amt,
                    ...(comp !== undefined && !isNaN(comp) && comp >= amt ? { compareAtAmount: comp } : {}),
                    ...(p.costAmount !== undefined && !isNaN(p.costAmount) ? { costAmount: p.costAmount } : {}),
                    ...(p.countryCode ? { countryCode: p.countryCode } : {}),
                    ...(p.countryName ? { countryName: p.countryName } : {}),
                    ...(p.locationCode ? { locationCode: p.locationCode } : {}),
                    ...(p.locationName ? { locationName: p.locationName } : {}),
                };
            }),
        }));

        // Determine baseCurrency matching the first variant currency or "USD"
        const productBaseCurrency = (sanitizedVariants[0]?.prices[0]?.currency || "USD").toUpperCase();

        const payload: CreateProductInput | UpdateProductInput = {
            title: title.trim(),
            ...(slug.trim() ? { slug: slugify(slug.trim()) } : {}),
            ...(brand.trim() ? { brand: brand.trim() } : {}),
            categoryId,
            baseCurrency: productBaseCurrency,
            status,
            ...(shortDescription.trim() ? { shortDescription: shortDescription.trim() } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            variants: sanitizedVariants,
            images,
            ...(thumbnail ? { thumbnail } : images.length > 0 ? { thumbnail: images[0] } : {}),
            tags: combinedTags,
            serviceableLocations: serviceableLocationsPayload,
            ...(storageInstructions.trim() ? { storageInstructions: storageInstructions.trim() } : {}),
            ...(allergenList.length > 0 ? { allergens: allergenList } : {}),
            ...(nutrition ? { nutritionInfo: nutrition } : {}),
            ...(mode === "create" && hasAnySeo ? { seo: seoPayload } : {}),
        };

        try {
            await onSubmit(payload);
        } catch (err: unknown) {
            let message = "Failed to save product.";
            if (err && typeof err === "object") {
                const apiErr = err as { message?: string; details?: unknown; code?: string };
                if (apiErr.details && typeof apiErr.details === "object") {
                    const issues: string[] = [];
                    for (const [field, msgs] of Object.entries(apiErr.details as Record<string, unknown>)) {
                        if (Array.isArray(msgs)) {
                            issues.push(`${field}: ${msgs.join(", ")}`);
                        } else if (typeof msgs === "string") {
                            issues.push(`${field}: ${msgs}`);
                        }
                    }
                    if (issues.length > 0) {
                        message = `Validation Error: ${issues.join(" | ")}`;
                    } else if (apiErr.message) {
                        message = apiErr.message;
                    }
                } else if (apiErr.message) {
                    message = apiErr.message;
                }
            } else if (err instanceof Error) {
                message = err.message;
            }
            setLocalError(message);
        }
    };

    // Tab definitions: on create show SEO, on edit hide SEO as it is managed in dedicated SEO table
    type ProductFormTab = "seo" | "basic" | "media" | "pricing" | "locations";
    const [activeTab, setActiveTab] = useState<ProductFormTab>(mode === "edit" ? "basic" : "seo");

    const tabsConfig = [
        ...(mode === "create"
            ? [
                  {
                      id: "seo" as const,
                      label: "Search Engine Optimization (SEO)",
                      shortLabel: "SEO & Discovery",
                      icon: Globe,
                      sectionHeader: "Search Engine Optimization & Social Sharing",
                      badge: metaTitle && metaDescription ? "Configured" : "Recommended",
                  },
              ]
            : []),
        {
            id: "basic" as const,
            label: "Basic Information",
            shortLabel: "Basic Details",
            icon: Package,
            sectionHeader: "Basic Information & Food Attributes",
            badge: title ? "Ready" : "Required",
        },
        {
            id: "media" as const,
            label: "Media & Product Gallery",
            shortLabel: "Media & Gallery",
            icon: Sparkles,
            sectionHeader: "Media Gallery & Primary Thumbnail",
            badge: `${images.length} items`,
        },
        {
            id: "pricing" as const,
            label: "Pack Sizes & Multi-Currency Pricing",
            shortLabel: "Variants & Pricing",
            icon: Layers,
            sectionHeader: "Pack Sizes, Weights, SKUs & Tiered Pricing",
            badge: variants.length > 0 ? `${variants.length} packs` : "None added",
        },
        {
            id: "locations" as const,
            label: "Serviceable Delivery Locations",
            shortLabel: "Delivery Locations",
            icon: MapPin,
            sectionHeader: "Serviceable Delivery Zones & International Coverage",
            badge: isAllLocations ? "All Zones (*)" : `${selectedLocations.length} zones`,
        },
    ];

    const activeTabIndex = tabsConfig.findIndex((t) => t.id === activeTab);
    const activeTabMeta = tabsConfig[activeTabIndex] || tabsConfig[0];
    const prevTab = activeTabIndex > 0 ? tabsConfig[activeTabIndex - 1] : null;
    const nextTab = activeTabIndex < tabsConfig.length - 1 ? tabsConfig[activeTabIndex + 1] : null;

    return (
        <form onSubmit={handleFormSubmit} className="flex flex-col lg:flex-row gap-6 items-start pb-12">
            {/* ======================================================== */}
            {/* LEFT COLUMN: Sidebar Navigation & Stats (Matching screenshot) */}
            {/* ======================================================== */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 lg:sticky lg:top-20">
                {/* Header title matching screenshot */}
                <div>
                    <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                        {mode === "create" ? "Create Product" : "Edit Product"}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        Set up your product details and SEO.
                    </p>
                </div>

                {/* Vertical Tab Navigation Pills matching screenshot */}
                <div className="flex flex-col gap-1.5">
                    {tabsConfig.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                                    isActive
                                        ? "bg-blue-600 text-white shadow-xs"
                                        : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <Icon
                                        size={15}
                                        className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-neutral-500"}`}
                                    />
                                    <span className="truncate">{tab.shortLabel}</span>
                                </div>
                                {tab.badge && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 font-medium ${
                                            isActive
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400"
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Navigation sub-section matching screenshot */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block mb-2">
                        Navigation
                    </span>
                    <button
                        type="button"
                        onClick={() => router.push("/products")}
                        className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={13} />
                        <span>Back to products</span>
                    </button>
                </div>

                {/* Course/Product Stats Card matching screenshot */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-[#111111] flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <Sparkles size={12} />
                        <span>Product Overview</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">SEO Health</span>
                        <span className={`font-semibold ${metaTitle && metaDescription ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {metaTitle && metaDescription ? "Configured" : "Incomplete"}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">Pack Sizes</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {variants.length} Variants
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">Coverage</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                            {isAllLocations ? "All Zones (*)" : `${selectedLocations.length} Zones`}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-neutral-400">Status</span>
                        <Badge variant={status === "PUBLISHED" ? "success" : "neutral"} size="sm">
                            {status}
                        </Badge>
                    </div>
                </div>

                {/* Primary Action Button matching screenshot */}
                <div className="flex flex-col gap-2 pt-1">
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={isSubmitting}
                        className="w-full h-10 text-xs font-semibold gap-2 shadow-xs cursor-pointer justify-center"
                    >
                        <Save size={14} />
                        <span>
                            {isSubmitting
                                ? "Saving Product..."
                                : mode === "create"
                                ? "Create Product"
                                : "Save Changes"}
                        </span>
                    </Button>

                    {mode === "edit" && onDelete && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleteOpen(true)}
                            disabled={isSubmitting || isDeleting}
                            className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-neutral-800"
                        >
                            <Trash2 size={13} className="mr-1" />
                            <span>Delete Product</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: Active Tab Content (Matching screenshot) */}
            {/* ======================================================== */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* Notifications */}
                {saveNotice && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0" />
                        <span>{saveNotice}</span>
                    </div>
                )}

                {(localError || errorMessage) && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{localError || errorMessage}</span>
                    </div>
                )}

                {/* Notice in edit mode linking to dedicated SEO Table */}
                {mode === "edit" && initialProduct?.id && (
                    <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Globe size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                                    SEO Metadata is managed in the SEO Table
                                </p>
                                <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
                                    Edit global search tags, robots, canonical URLs, and city/regional overrides individually or in bulk.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => router.push(`/seo?type=PRODUCT&id=${initialProduct.id}`)}
                            className="text-xs shrink-0 font-semibold gap-1.5 h-8"
                        >
                            <span>Open SEO Table</span>
                            <ArrowRight size={13} />
                        </Button>
                    </div>
                )}

                {/* Section Header Breadcrumb Pill matching screenshot */}
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 pb-1">
                    <div className="flex items-center gap-2">
                        <activeTabMeta.icon size={14} className="text-blue-600 dark:text-blue-400" />
                        <span>{activeTabMeta.sectionHeader}</span>
                    </div>
                    <span className="text-[11px] font-medium lowercase text-slate-400 dark:text-neutral-500">
                        tab {activeTabIndex + 1} of {tabsConfig.length}
                    </span>
                </div>

                {/* ---------------------------------------------------- */}
                {/* TAB 1: SEO & SEARCH ENGINES (First priority per user) */}
                {/* ---------------------------------------------------- */}
                {activeTab === "seo" && mode === "create" && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                        {/* Multi-Regional & City SEO Card with Google SERP Live Preview */}
                        <GenericSeoCard
                            entityTitle={title}
                            entitySlug={slug}
                            entityDescription={shortDescription || description}
                            routePrefix="products"
                            categorySlug={categories.find((c) => c.id === categoryId)?.slug || ""}
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
                            internalSection={internalSection}
                            setInternalSection={setInternalSection}
                            bottomSection={bottomSection}
                            setBottomSection={setBottomSection}
                            locationOverrides={locationOverrides}
                            setLocationOverrides={setLocationOverrides}
                            availableLocations={availableLocationOptions}
                            disabled={isSubmitting}
                        />

                        {/* Social Sharing OpenGraph Card */}
                        <GenericSocialCard
                            entityTitle={title}
                            entityDescription={shortDescription || description}
                            primaryImage={thumbnail || images[0] || ""}
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
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 2: BASIC INFORMATION & FOOD ATTRIBUTES */}
                {/* ---------------------------------------------------- */}
                {activeTab === "basic" && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Package size={13} />
                                    </div>
                                    <div>
                                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                            Product Details
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                            Core title, URL slug, brand identity, and catalog categorization.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="mb-1">Product Title *</Label>
                                        <Input
                                            size="sm"
                                            value={title}
                                            onChange={(e) => handleTitleChange(e.target.value)}
                                            placeholder="Enter product title"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1">URL Slug</Label>
                                        <Input
                                            size="sm"
                                            value={slug}
                                            onChange={(e) => handleSlugChange(e.target.value)}
                                            placeholder="Enter product slug"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <Label className="mb-1">Brand / Kitchen</Label>
                                        <Input
                                            size="sm"
                                            value={brand}
                                            onChange={(e) => setBrand(e.target.value)}
                                            placeholder="Enter brand name"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1">Category *</Label>
                                        <Select
                                            size="sm"
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            disabled={isSubmitting}
                                            options={categories.map((c) => ({
                                                value: c.id,
                                                label: c.name,
                                            }))}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1">Publishing Status</Label>
                                        <Select
                                            size="sm"
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as ProductStatus)}
                                            disabled={isSubmitting}
                                            options={[
                                                { value: "PUBLISHED", label: "Published (Live)" },
                                                { value: "DRAFT", label: "Draft (Hidden)" },
                                                { value: "ARCHIVED", label: "Archived" },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Short Description */}
                                <div>
                                    <Label className="mb-1">Short Description (1–2 Line Summary)</Label>
                                    <Input
                                        size="sm"
                                        value={shortDescription}
                                        onChange={(e) => setShortDescription(e.target.value)}
                                        placeholder="Enter short summary description"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Full Description */}
                                <div>
                                    <Label className="mb-1">Detailed Description</Label>
                                    <Textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter detailed description"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Tags Manager */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <Label>Product Tags</Label>
                                        <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                            Press Enter or comma to add
                                        </span>
                                    </div>
                                    <div className="min-h-[38px] px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex flex-wrap items-center gap-1.5">
                                        {tags.map((t) => (
                                            <span
                                                key={t}
                                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                            >
                                                <span>#{t}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(t)}
                                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            placeholder={tags.length === 0 ? "Enter tags (press Enter or comma)..." : "Enter more tags..."}
                                            disabled={isSubmitting}
                                            className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-none text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 py-0.5"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Food & Dietary Specifications */}
                        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                            <button
                                type="button"
                                onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                                className="w-full flex items-center justify-between cursor-pointer pb-1"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <Utensils size={13} />
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                            Food & Dietary Specifications (Optional)
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                            Storage guidelines, allergen warnings, nutritional facts, and dietary badges.
                                        </p>
                                    </div>
                                </div>
                                {isSpecsOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </button>

                            {isSpecsOpen && (
                                <div className="pt-4 space-y-3.5 border-t border-slate-100 dark:border-neutral-800 mt-3 animate-in fade-in-50 duration-150">
                                    {/* Common Dietary Tag Selector */}
                                    <div>
                                        <Label className="mb-1.5">Dietary Classifications</Label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {COMMON_DIETARY_TAGS.map((tag) => {
                                                const isSelected = selectedDietaryTags.includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedDietaryTags((prev) =>
                                                                isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                                                            )
                                                        }
                                                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                                                                : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400"
                                                        }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label className="mb-1">Storage Instructions</Label>
                                            <Input
                                                size="sm"
                                                value={storageInstructions}
                                                onChange={(e) => setStorageInstructions(e.target.value)}
                                                placeholder="Enter storage instructions"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1">Allergen Declarations</Label>
                                            <Input
                                                size="sm"
                                                value={allergens}
                                                onChange={(e) => setAllergens(e.target.value)}
                                                placeholder="Enter allergen declarations"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    {/* Nutrition Grid & Dynamic Nutrients */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="mb-0">Nutritional Information (Per Serving)</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddCustomNutrient}
                                                className="h-7 text-xs gap-1 font-medium"
                                            >
                                                <Plus size={12} />
                                                <span>Add Custom Nutrient</span>
                                            </Button>
                                        </div>

                                        {/* Baseline 5 Macros */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-1">Serving Size</span>
                                                <Input
                                                    size="sm"
                                                    value={servingSize}
                                                    onChange={(e) => setServingSize(e.target.value)}
                                                    placeholder="e.g. 50 g"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-1">Calories (kcal)</span>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={calories}
                                                    onChange={(e) => setCalories(e.target.value)}
                                                    placeholder="240"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-1">Protein (g)</span>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={protein}
                                                    onChange={(e) => setProtein(e.target.value)}
                                                    placeholder="6.5"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-1">Carbs (g)</span>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={carbs}
                                                    onChange={(e) => setCarbs(e.target.value)}
                                                    placeholder="28"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mb-1">Fat (g)</span>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={fat}
                                                    onChange={(e) => setFat(e.target.value)}
                                                    placeholder="12"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>

                                        {/* Quick-Add Common Nutrient Presets */}
                                        <div>
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                                                Quick Add Nutrients:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {COMMON_NUTRIENT_PRESETS.map((preset) => {
                                                    const isAlreadyAdded = customNutrients.some(
                                                        (n) => n.name.toLowerCase() === preset.name.toLowerCase()
                                                    );
                                                    return (
                                                        <button
                                                            key={preset.name}
                                                            type="button"
                                                            disabled={isAlreadyAdded || isSubmitting}
                                                            onClick={() => handleAddPresetNutrient(preset)}
                                                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
                                                                isAlreadyAdded
                                                                    ? "bg-slate-100 dark:bg-neutral-800 border-transparent text-slate-400 dark:text-neutral-600 opacity-60 cursor-default"
                                                                    : "bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                            }`}
                                                        >
                                                            <Plus size={10} />
                                                            <span>{preset.name} ({preset.unit})</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Custom / Additional Nutrients Table */}
                                        {customNutrients.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800/80">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                                                        Active Additional Nutrients ({customNutrients.length})
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                                                        Values shown on product nutrition label
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {customNutrients.map((nutrient, idx) => (
                                                        <div
                                                            key={nutrient.id || idx}
                                                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 animate-in fade-in-50 duration-100"
                                                        >
                                                            <div className="flex-1">
                                                                <Input
                                                                    size="sm"
                                                                    value={nutrient.name}
                                                                    onChange={(e) => handleUpdateCustomNutrient(idx, { name: e.target.value })}
                                                                    placeholder="Nutrient Name (e.g. Dietary Fiber, Omega-3, Calcium)"
                                                                    className="h-8 text-xs bg-white dark:bg-[#111111]"
                                                                    disabled={isSubmitting}
                                                                />
                                                            </div>
                                                            <div className="w-28">
                                                                <Input
                                                                    size="sm"
                                                                    type="number"
                                                                    step="any"
                                                                    value={nutrient.amount ?? ""}
                                                                    onChange={(e) => handleUpdateCustomNutrient(idx, { amount: e.target.value })}
                                                                    placeholder="Amount"
                                                                    className="h-8 text-xs bg-white dark:bg-[#111111]"
                                                                    disabled={isSubmitting}
                                                                />
                                                            </div>
                                                            <div className="w-24">
                                                                <select
                                                                    value={nutrient.unit || "g"}
                                                                    onChange={(e) => handleUpdateCustomNutrient(idx, { unit: e.target.value })}
                                                                    disabled={isSubmitting}
                                                                    className="w-full h-8 px-2 text-xs rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 cursor-pointer"
                                                                >
                                                                    <option value="g">g</option>
                                                                    <option value="mg">mg</option>
                                                                    <option value="mcg">mcg</option>
                                                                    <option value="%">% DV</option>
                                                                    <option value="kcal">kcal</option>
                                                                    <option value="IU">IU</option>
                                                                    <option value="ml">ml</option>
                                                                </select>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCustomNutrient(idx)}
                                                                disabled={isSubmitting}
                                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                                                                title="Remove nutrient"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 3: MEDIA & PRODUCT GALLERY */}
                {/* ---------------------------------------------------- */}
                {activeTab === "media" && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                        <ImageGalleryManager
                            images={images}
                            thumbnail={thumbnail}
                            onChangeImages={setImages}
                            onChangeThumbnail={setThumbnail}
                            disabled={isSubmitting}
                        />
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 4: PACK SIZES & MULTI-CURRENCY PRICING */}
                {/* ---------------------------------------------------- */}
                {activeTab === "pricing" && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                        <VariantMatrixManager
                            variants={variants}
                            onChange={setVariants}
                            productTitle={title}
                            baseCurrency="INR"
                            disabled={isSubmitting}
                            availableLocations={locations}
                        />
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* TAB 5: SERVICEABLE DELIVERY LOCATIONS */}
                {/* ---------------------------------------------------- */}
                {activeTab === "locations" && (
                    <div className="space-y-4 animate-in fade-in-50 duration-150">
                        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <MapPin size={13} />
                                    </div>
                                    <div>
                                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                            Serviceable Delivery Locations
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                            Restrict which cities or countries can order this product, or leave enabled for all locations.
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={isAllLocations ? "success" : "neutral"} size="sm">
                                    {isAllLocations ? "All Locations" : `${selectedLocations.length} Selected`}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                {/* Worldwide / All Locations Option */}
                                <div className="p-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAllLocations}
                                            onChange={(e) => handleToggleAllLocations(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <Globe size={13} className="text-emerald-600" />
                                                Available in All Serviceable Locations
                                            </span>
                                            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                                Default coverage across every active city and international delivery zone.
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* Selective Locations Checkboxes */}
                                {!isAllLocations && (
                                    <div className="pt-2">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block mb-2">
                                            Select specific cities and countries:
                                        </span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {locations.map((loc) => {
                                                const isSelected = selectedLocations.includes(loc.code.toUpperCase());
                                                return (
                                                    <button
                                                        key={loc.id}
                                                        type="button"
                                                        onClick={() => handleToggleLocationCode(loc.code)}
                                                        className={`p-2.5 rounded-lg border text-left flex items-start justify-between transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700"
                                                                : "bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                                <span>{loc.name}</span>
                                                                <span className="font-mono text-[10px] text-slate-400">({loc.code})</span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                                                {loc.type} · {loc.currency || "INR"}
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            readOnly
                                                            className="rounded text-emerald-600 mt-0.5 pointer-events-none"
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Section Pager / Navigation Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-neutral-800 mt-2">
                    {prevTab ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(prevTab.id)}
                            className="gap-1.5 text-xs font-medium cursor-pointer"
                        >
                            <ArrowLeft size={13} />
                            <span>Previous: {prevTab.shortLabel}</span>
                        </Button>
                    ) : (
                        <div />
                    )}

                    {nextTab ? (
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setActiveTab(nextTab.id)}
                            className="gap-1.5 text-xs font-medium cursor-pointer ml-auto"
                        >
                            <span>Next: {nextTab.shortLabel}</span>
                            <ChevronDown size={13} className="-rotate-90" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            className="gap-1.5 text-xs font-semibold cursor-pointer ml-auto"
                        >
                            <Save size={13} />
                            <span>{isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {mode === "edit" && onDelete && (
                <ConfirmDialog
                    isOpen={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    onConfirm={async () => {
                        await onDelete();
                        setIsDeleteOpen(false);
                    }}
                    title={`Delete Product "${title}"?`}
                    description="Are you sure you want to permanently remove this product and all its pack size variants? This action cannot be undone."
                    confirmLabel={isDeleting ? "Deleting..." : "Delete Product"}
                    variant="danger"
                />
            )}
        </form>
    );
}
