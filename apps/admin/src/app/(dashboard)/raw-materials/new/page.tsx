"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useGetRawMaterialsQuery,
    useCreateRawMaterialMutation,
    useGetProductsQuery,
} from "../../../../store/api";
import type {
    RawMaterialCategory,
    RawMaterialUnit,
    RawMaterialUsage,
    Product,
    ProductVariant,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    FormField,
    Select,
    SearchableSelect,
    toast,
} from "@ecommers/ui";
import {
    Boxes,
    ArrowLeft,
    CheckCircle2,
    Layers,
    ShoppingBag,
    Sparkles,
    Scale,
    AlertTriangle,
    Tag,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

const CATEGORIES: Array<{ label: string; value: RawMaterialCategory }> = [
    { label: "Ingredients", value: "INGREDIENT" },
    { label: "Dairy & Fats", value: "DAIRY" },
    { label: "Sweeteners & Syrups", value: "SWEETENER" },
    { label: "Spices & Seasonings", value: "SPICE" },
    { label: "Oils & Ghee", value: "OIL" },
    { label: "Grains, Flours & Pulses", value: "GRAIN" },
    { label: "Packaging Materials (Pouches, Jars)", value: "PACKAGING" },
    { label: "Other Supplies", value: "OTHER" },
];

const UNITS: Array<{ label: string; value: RawMaterialUnit }> = [
    { label: "Kilograms (kg)", value: "kg" },
    { label: "Grams (g)", value: "g" },
    { label: "Liters (l)", value: "l" },
    { label: "Milliliters (ml)", value: "ml" },
    { label: "Pieces (pcs)", value: "pcs" },
    { label: "Packs (pack)", value: "pack" },
];

function generateMaterialSkuSlug(name: string): string {
    if (!name || !name.trim()) return "";
    const cleaned = name
        .trim()
        .replace(/[^\w\s-]/g, " ")
        .replace(/[\s_]+/g, " ")
        .trim();

    if (!cleaned) return "ITEM";

    const words = cleaned
        .split(" ")
        .map((w) => w.toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean);

    if (words.length === 0) return "ITEM";

    let slug = "";
    for (const word of words) {
        if (!slug) {
            slug = word.slice(0, 20);
        } else if ((slug + "-" + word).length <= 26) {
            slug += "-" + word;
        } else {
            break;
        }
    }
    return slug || "ITEM";
}

function resolveUniqueMaterialSku(name: string, existingCodes: Set<string>): string {
    if (!name || !name.trim()) return "";
    const baseSlug = generateMaterialSkuSlug(name);
    const baseSku = `RM-${baseSlug}`;

    if (!existingCodes.has(baseSku)) {
        return baseSku;
    }

    let counter = 1;
    while (counter <= 999) {
        const suffix = counter < 10 ? `0${counter}` : `${counter}`;
        const candidate = `${baseSku}-${suffix}`;
        if (!existingCodes.has(candidate)) {
            return candidate;
        }
        counter++;
    }

    return `${baseSku}-${Date.now().toString().slice(-4)}`;
}

export default function NewRawMaterialPage() {
    const router = useRouter();

    const { data: rawMaterials = [] } = useGetRawMaterialsQuery();
    const [createRawMaterial, { isLoading: isSaving }] = useCreateRawMaterialMutation();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState<RawMaterialCategory>("INGREDIENT");
    const [usage, setUsage] = useState<RawMaterialUsage>("RAW_MATERIAL");
    const [unit, setUnit] = useState<RawMaterialUnit>("kg");
    const [initialStock, setInitialStock] = useState("");
    const [initialCost, setInitialCost] = useState("");
    const [threshold, setThreshold] = useState("5");

    // SKU Auto-generation & Uniqueness state
    const existingCodes = useMemo(() => new Set(rawMaterials.map((m) => m.code.toUpperCase())), [rawMaterials]);
    const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
    const [codeValidationState, setCodeValidationState] = useState<"idle" | "unique" | "duplicate">("idle");
    const [suggestedAlternativeCode, setSuggestedAlternativeCode] = useState("");

    // Products & Variants list for linking
    const shouldLoadProducts = usage === "SELLABLE" || usage === "BOTH";
    const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery(
        { limit: 100 },
        { skip: !shouldLoadProducts }
    );
    const products = productsData?.items || [];
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedVariantId, setSelectedVariantId] = useState("");

    useEffect(() => {
        if (products.length > 0 && !selectedProductId) {
            setSelectedProductId(products[0]!.id);
            setSelectedVariantId("");
        }
    }, [products, selectedProductId]);

    // Update variant when product changes (default to All Variants)
    const handleProductChange = (prodId: string) => {
        setSelectedProductId(prodId);
        setSelectedVariantId("");
    };

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    const productOptions = useMemo(() => {
        return [
            { value: "", label: "-- None / Select Later --" },
            ...products.map((p, idx) => {
                const pId = p.id || (p as any)._id || `p-${idx}`;
                const variantCount = p.variants?.length || 0;
                return {
                    value: pId,
                    label: p.title,
                    subText: p.slug,
                    badge: `${variantCount} variant${variantCount === 1 ? "" : "s"}`,
                    description: p.description ? p.description.slice(0, 60) : undefined,
                };
            }),
        ];
    }, [products]);

    const variantOptions = useMemo(() => {
        if (!selectedProduct?.variants || selectedProduct.variants.length === 0) {
            return [{ value: "", label: "All Variants (Repackage into any variant)" }];
        }
        return [
            { value: "", label: "All Variants (Repackage into any variant)" },
            ...selectedProduct.variants.map((v: ProductVariant, idx: number) => {
                const vId = v.id || (v as any)._id || v.sku || `v-${idx}`;
                const price = v.prices?.[0]?.amount;
                return {
                    value: vId,
                    label: v.title,
                    subText: v.sku || "No SKU",
                    badge: price ? `₹${price}` : undefined,
                };
            }),
        ];
    }, [selectedProduct]);

    // Auto-generate code when Material Name changes
    const handleNameChange = (val: string) => {
        setName(val);
        if (!isCodeManuallyEdited || !code.trim()) {
            if (!val.trim()) {
                setCode("");
                setCodeValidationState("idle");
                return;
            }
            const autoSku = resolveUniqueMaterialSku(val, existingCodes);
            setCode(autoSku);
            setCodeValidationState("unique");
        }
    };

    // User manual edit of Material Code (SKU)
    const handleCodeChange = (val: string) => {
        const cleaned = val.toUpperCase().replace(/[^A-Z0-9-]/g, "");
        setIsCodeManuallyEdited(true);
        setCode(cleaned);

        if (!cleaned.trim()) {
            setCodeValidationState("idle");
            return;
        }

        if (existingCodes.has(cleaned)) {
            setCodeValidationState("duplicate");
            const slugPart = cleaned.replace(/^RM-/, "");
            const alt = resolveUniqueMaterialSku(slugPart, existingCodes);
            setSuggestedAlternativeCode(alt);
        } else {
            setCodeValidationState("unique");
        }
    };

    // Apply suggested unique alternative if duplicate
    const handleAutoFix = () => {
        if (suggestedAlternativeCode) {
            setCode(suggestedAlternativeCode);
            setCodeValidationState("unique");
            toast.success(`Updated to unique SKU: ${suggestedAlternativeCode}`);
        }
    };

    // Re-sync Material Code from Material Name
    const handleResyncCode = () => {
        setIsCodeManuallyEdited(false);
        if (!name.trim()) {
            setCode("");
            setCodeValidationState("idle");
            return;
        }
        const autoSku = resolveUniqueMaterialSku(name, existingCodes);
        setCode(autoSku);
        setCodeValidationState("unique");
        toast.success(`Re-generated unique SKU: ${autoSku}`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!code.trim() || !name.trim()) {
            toast.error("Please provide both Material Name and Material Code (SKU).");
            return;
        }

        if (existingCodes.has(code.trim().toUpperCase())) {
            toast.error(`Material Code '${code.trim().toUpperCase()}' is already taken. Please click Auto-fix.`);
            return;
        }

        try {
            await createRawMaterial({
                code: code.trim().toUpperCase(),
                name: name.trim(),
                category,
                usage,
                linkedProductId: (usage === "SELLABLE" || usage === "BOTH") && selectedProductId ? selectedProductId : undefined,
                linkedVariantId: (usage === "SELLABLE" || usage === "BOTH") && selectedVariantId ? selectedVariantId : undefined,
                unit,
                initialStock: initialStock ? parseFloat(initialStock) : 0,
                initialCostPerUnit: initialCost ? parseFloat(initialCost) : 0,
                reorderThreshold: threshold ? parseFloat(threshold) : 5,
            }).unwrap();

            toast.success(`Raw material '${name}' created successfully!`);
            router.push("/raw-materials");
        } catch (err: unknown) {
            console.error("Failed to create raw material:", err);
            const msg = err instanceof Error ? err.message : "Failed to create raw material.";
            toast.error(msg);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header & Breadcrumb */}
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/raw-materials"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                New Raw Material
                            </h1>
                            <Badge variant="primary" size="sm">Catalog Item</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Register a new raw material, specify dual usage nature, and set opening balances.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Identification & Classification */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Boxes size={16} className="text-blue-600" />
                        <span>1. Material Identification & Unit of Measure</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Material Name" required helperText="Descriptive name of item e.g. Pure Gram Flour (Besan)">
                            <Input
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Pure Gram Flour (Besan)"
                                required
                                className="text-xs h-10 font-semibold"
                            />
                        </FormField>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                    Material Code (SKU) <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    {!isCodeManuallyEdited && code ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/50 px-1.5 py-0.5 rounded">
                                            <Sparkles size={10} /> Auto-generated
                                        </span>
                                    ) : null}
                                    {isCodeManuallyEdited ? (
                                        <button
                                            type="button"
                                            onClick={handleResyncCode}
                                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            title="Re-generate unique code from Material Name"
                                        >
                                            <RefreshCw size={10} /> Re-sync
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="relative">
                                <Input
                                    value={code}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="RM-BESAN"
                                    required
                                    className="font-mono uppercase font-bold text-xs h-10 pr-9"
                                />
                                {codeValidationState === "unique" && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                                {codeValidationState === "duplicate" && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none">
                                        <AlertCircle size={16} />
                                    </div>
                                )}
                            </div>

                            {codeValidationState === "unique" && (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                                    <CheckCircle2 size={12} /> Unique SKU available
                                </p>
                            )}

                            {codeValidationState === "duplicate" && (
                                <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center justify-between gap-1 mt-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2 rounded-lg">
                                    <span className="flex items-center gap-1">
                                        <AlertCircle size={12} className="shrink-0" /> Code already in use
                                    </span>
                                    {suggestedAlternativeCode && (
                                        <button
                                            type="button"
                                            onClick={handleAutoFix}
                                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors"
                                        >
                                            Auto-fix: {suggestedAlternativeCode}
                                        </button>
                                    )}
                                </div>
                            )}

                            {codeValidationState === "idle" && (
                                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                    Unique identifier (e.g. RM-BESAN), auto-generated as you type material name
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Category" required>
                            <Select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as RawMaterialCategory)}
                                className="text-xs h-10"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </Select>
                        </FormField>

                        <FormField label="Base Unit of Measure (UoM)" required helperText="Stock accounting unit (kg, g, l, ml, pcs)">
                            <Select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value as RawMaterialUnit)}
                                className="text-xs h-10 font-mono"
                            >
                                {UNITS.map((u) => (
                                    <option key={u.value} value={u.value}>
                                        {u.label}
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                </Card>

                {/* 2. Usage Nature: RAW_MATERIAL vs SELLABLE vs BOTH */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Sparkles size={16} className="text-purple-600" />
                        <span>2. Material Usage Workflow (Dual Nature Support)</span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        Choose whether this material is exclusively a manufacturing input, sold directly to retail customers, or both (e.g. Besan 10kg used for Ladoo and also sold as 1kg retail pouches).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Option 1: RAW_MATERIAL */}
                        <div
                            onClick={() => setUsage("RAW_MATERIAL")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                usage === "RAW_MATERIAL"
                                    ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 shadow-xs"
                                    : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center">
                                    <Layers size={16} />
                                </div>
                                {usage === "RAW_MATERIAL" && <CheckCircle2 size={16} className="text-blue-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Raw Material Only</h4>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Used exclusively as an ingredient or packaging input in production recipes.
                            </p>
                        </div>

                        {/* Option 2: SELLABLE */}
                        <div
                            onClick={() => setUsage("SELLABLE")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                usage === "SELLABLE"
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 shadow-xs"
                                    : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center">
                                    <ShoppingBag size={16} />
                                </div>
                                {usage === "SELLABLE" && <CheckCircle2 size={16} className="text-emerald-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sellable Retail Only</h4>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Sourced or bulk-purchased directly for repackaging and selling to retail customers.
                            </p>
                        </div>

                        {/* Option 3: BOTH */}
                        <div
                            onClick={() => setUsage("BOTH")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                usage === "BOTH"
                                    ? "bg-purple-50/60 dark:bg-purple-950/40 border-purple-600 dark:border-purple-500 shadow-xs"
                                    : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 flex items-center justify-center">
                                    <Sparkles size={16} />
                                </div>
                                {usage === "BOTH" && <CheckCircle2 size={16} className="text-purple-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Dual Use (Both)</h4>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Participates in recipes (e.g. Ladoo) AND can be repackaged into retail packs (e.g. 1kg pouches).
                            </p>
                        </div>
                    </div>

                    {/* Conditional Link to Retail Product & Variant */}
                    {(usage === "SELLABLE" || usage === "BOTH") && (
                        <div className="mt-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <Tag size={14} className="text-purple-600" />
                                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                                    Link to Sellable Retail Product & Variant
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-neutral-400">
                                Connect this raw material to its corresponding consumer product in your catalog for automated stock repackaging runs.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <FormField label="Retail Product">
                                    <SearchableSelect
                                        value={selectedProductId}
                                        onChange={handleProductChange}
                                        options={productOptions}
                                        disabled={loadingProducts}
                                        placeholder="-- None / Select Later --"
                                        searchPlaceholder="Search product by title, slug..."
                                        size="sm"
                                        pageSize={15}
                                    />
                                </FormField>

                                <FormField
                                    label="Target Product Variant"
                                    helperText="Optional. Select 'All Variants' if this bulk material can be repackaged into multiple SKU sizes (e.g. 250g, 500g, 1kg)."
                                >
                                    <SearchableSelect
                                        value={selectedVariantId}
                                        onChange={setSelectedVariantId}
                                        options={variantOptions}
                                        disabled={!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0}
                                        placeholder="All Variants (Repackage into any variant)"
                                        searchPlaceholder="Search variant name, SKU..."
                                        size="sm"
                                        pageSize={15}
                                    />
                                </FormField>
                            </div>

                            {selectedProduct && (
                                <div className="mt-2.5 p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-slate-700 dark:text-neutral-300 flex items-start gap-2.5">
                                    {selectedVariantId ? (
                                        <>
                                            <Badge variant="primary" size="sm" className="mt-0.5 shrink-0">Single Variant Default</Badge>
                                            <p className="text-[11px] leading-relaxed">
                                                Repackaging runs will pre-select this specific variant by default. You can still repackage into any other variant whenever needed.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Badge variant="success" size="sm" className="mt-0.5 shrink-0">All Variants Supported</Badge>
                                            <p className="text-[11px] leading-relaxed">
                                                This raw material is linked to the <strong>{selectedProduct.title}</strong> product family. During repackaging runs, warehouse staff can choose to transform this bulk material into <strong>any of its {selectedProduct.variants?.length || 0} variants</strong> (e.g. 250g, 500g, 750g, 1kg).
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* 3. Opening Inventory & Alerts */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Scale size={16} className="text-emerald-600" />
                        <span>3. Opening Inventory Balances & Alerts (Optional)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label={`Opening Stock Quantity (${unit})`} helperText="Current physical stock on hand">
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={initialStock}
                                onChange={(e) => setInitialStock(e.target.value)}
                                placeholder="0"
                                className="font-mono text-xs h-10"
                            />
                        </FormField>

                        <FormField label={`Initial Cost per ${unit} (₹)`} helperText="Purchase or valuation cost">
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={initialCost}
                                onChange={(e) => setInitialCost(e.target.value)}
                                placeholder="0.00"
                                className="font-mono text-xs h-10"
                            />
                        </FormField>

                        <FormField label={`Low Stock Alert Level (${unit})`} required helperText="Threshold to trigger reorder alert">
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                placeholder="5"
                                required
                                className="font-mono text-xs h-10 font-bold text-amber-600"
                            />
                        </FormField>
                    </div>

                    {initialStock && parseFloat(initialStock) > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 size={16} />
                                <span>Initial Inventory Valuation:</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                                ₹{((parseFloat(initialStock) || 0) * (parseFloat(initialCost) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
                </Card>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Link href="/raw-materials">
                        <Button variant="outline" type="button" size="md">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        variant="primary"
                        type="submit"
                        size="md"
                        disabled={isSaving}
                        className="gap-2 px-6 font-semibold"
                    >
                        {isSaving ? "Saving..." : "Create Material"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
