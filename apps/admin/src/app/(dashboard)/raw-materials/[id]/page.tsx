"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type {
    RawMaterial,
    RawMaterialCategory,
    RawMaterialUsage,
    Product,
    ProductVariant,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    Select,
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
    CalendarCheck,
    TrendingUp,
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

export default function EditRawMaterialPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [material, setMaterial] = useState<RawMaterial | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [category, setCategory] = useState<RawMaterialCategory>("INGREDIENT");
    const [usage, setUsage] = useState<RawMaterialUsage>("RAW_MATERIAL");
    const [threshold, setThreshold] = useState("5");
    const [isActive, setIsActive] = useState(true);

    // Retail Product Linkage
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedVariantId, setSelectedVariantId] = useState("");

    useEffect(() => {
        const fetchMaterial = async () => {
            setLoading(true);
            try {
                const data = await api.manufacturing.getRawMaterialById(id);
                setMaterial(data);
                setName(data.name);
                setCategory(data.category);
                setUsage(data.usage || "RAW_MATERIAL");
                setThreshold(String(data.reorderThreshold || 5));
                setIsActive(data.isActive ?? true);
                if (data.linkedProductId) setSelectedProductId(data.linkedProductId);
                if (data.linkedVariantId) setSelectedVariantId(data.linkedVariantId);
            } catch (err: unknown) {
                console.error("Failed to load raw material:", err);
                toast.error("Failed to load raw material details.");
            } finally {
                setLoading(false);
            }
        };

        fetchMaterial();
    }, [id]);

    useEffect(() => {
        if (usage === "SELLABLE" || usage === "BOTH") {
            setLoadingProducts(true);
            api.products
                .list({ limit: 100 })
                .then((res) => {
                    const prods = (res as any)?.products || (res as any)?.data || (Array.isArray(res) ? res : []);
                    setProducts(prods);
                })
                .catch((err) => {
                    console.error("Failed to load products for linkage:", err);
                })
                .finally(() => setLoadingProducts(false));
        }
    }, [usage]);

    const handleProductChange = (prodId: string) => {
        setSelectedProductId(prodId);
        const prod = products.find((p) => p.id === prodId);
        if (prod && prod.variants && prod.variants.length > 0) {
            setSelectedVariantId(prod.variants[0].id);
        } else {
            setSelectedVariantId("");
        }
    };

    const selectedProduct = products.find((p) => p.id === selectedProductId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Material Name is required.");
            return;
        }

        setIsSaving(true);
        try {
            await api.manufacturing.updateRawMaterial(id, {
                name: name.trim(),
                category,
                usage,
                linkedProductId: (usage === "SELLABLE" || usage === "BOTH") && selectedProductId ? selectedProductId : undefined,
                linkedVariantId: (usage === "SELLABLE" || usage === "BOTH") && selectedVariantId ? selectedVariantId : undefined,
                reorderThreshold: threshold ? parseFloat(threshold) : 5,
                isActive,
            });

            toast.success(`Raw material '${name}' updated successfully!`);
            router.push("/raw-materials");
        } catch (err: unknown) {
            console.error("Failed to update raw material:", err);
            const msg = err instanceof Error ? err.message : "Failed to update raw material.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-28 max-w-4xl mx-auto">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading raw material...</p>
            </div>
        );
    }

    if (!material) {
        return (
            <div className="max-w-4xl mx-auto py-16 text-center">
                <p className="text-sm text-slate-500">Raw material not found.</p>
                <Link href="/raw-materials" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">Back to Catalog</Button>
                </Link>
            </div>
        );
    }

    const valuation = (material.currentStock || 0) * (material.averageCost || 0);

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
                                Edit: {material.name}
                            </h1>
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                                {material.code}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Update specifications, material usage classification, and reorder thresholds.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href={`/raw-materials/lots?rawMaterialId=${material.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-amber-600">
                            <CalendarCheck size={13} />
                            <span>Active Lots</span>
                        </Button>
                    </Link>
                    <Link href={`/raw-materials/ledger?rawMaterialId=${material.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-blue-600">
                            <Layers size={13} />
                            <span>Stock Ledger</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Inventory Balance Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Current Stock</span>
                    <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                        {material.currentStock} {material.unit}
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Weighted Avg Cost (WAC)</span>
                    <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        ₹{material.averageCost.toFixed(2)}
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Latest Price</span>
                    <p className="text-xl font-bold font-mono text-slate-700 dark:text-neutral-300 mt-1">
                        ₹{material.lastPurchasePrice.toFixed(2)}
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Valuation</span>
                    <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                        ₹{valuation.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </Card>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Identification */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Boxes size={16} className="text-blue-600" />
                        <span>1. Material Details</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Material Code (SKU)" helperText="Unique immutable code">
                            <Input
                                value={material.code}
                                disabled
                                className="font-mono uppercase font-bold text-xs h-10 bg-slate-100 dark:bg-neutral-800 opacity-80 cursor-not-allowed"
                            />
                        </FormField>

                        <FormField label="Material Name" required>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="text-xs h-10 font-semibold"
                            />
                        </FormField>
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

                        <FormField label="Base Unit of Measure (UoM)">
                            <Input
                                value={material.unit}
                                disabled
                                className="font-mono text-xs h-10 bg-slate-100 dark:bg-neutral-800 opacity-80 cursor-not-allowed"
                            />
                        </FormField>
                    </div>
                </Card>

                {/* 2. Usage Nature */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Sparkles size={16} className="text-purple-600" />
                        <span>2. Material Usage Workflow</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            <p className="text-[11px] text-slate-500 mt-1">Used exclusively as a recipe ingredient.</p>
                        </div>

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
                            <p className="text-[11px] text-slate-500 mt-1">Repackaged & sold directly to consumers.</p>
                        </div>

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
                            <p className="text-[11px] text-slate-500 mt-1">Used in recipes AND repackaged into retail packs.</p>
                        </div>
                    </div>

                    {(usage === "SELLABLE" || usage === "BOTH") && (
                        <div className="mt-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/50 space-y-3">
                            <div className="flex items-center gap-2">
                                <Tag size={14} className="text-purple-600" />
                                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                                    Linked Retail Product & Variant
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <FormField label="Retail Product">
                                    <Select
                                        value={selectedProductId}
                                        onChange={(e) => handleProductChange(e.target.value)}
                                        disabled={loadingProducts}
                                        className="text-xs h-9"
                                    >
                                        <option value="">-- None / Select Later --</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </Select>
                                </FormField>

                                <FormField label="Target Product Variant">
                                    <Select
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                        disabled={!selectedProduct || !selectedProduct.variants || selectedProduct.variants.length === 0}
                                        className="text-xs h-9"
                                    >
                                        <option value="">-- Select Variant --</option>
                                        {selectedProduct?.variants?.map((v: ProductVariant) => (
                                            <option key={v.id} value={v.id}>
                                                {v.title} ({v.sku})
                                            </option>
                                        ))}
                                    </Select>
                                </FormField>
                            </div>
                        </div>
                    )}
                </Card>

                {/* 3. Reorder Threshold & Status */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Scale size={16} className="text-amber-600" />
                        <span>3. Inventory Reorder Level & Active Status</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label={`Reorder Threshold Alert (${material.unit})`} required helperText="Triggers low stock warnings when balance falls below this quantity">
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                required
                                className="font-mono text-xs h-10 font-bold text-amber-600"
                            />
                        </FormField>

                        <FormField label="Catalog Status">
                            <div className="flex items-center gap-3 pt-2">
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-800 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Active in Manufacturing & Intakes</span>
                                </label>
                            </div>
                        </FormField>
                    </div>
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
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
