"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import type {
    Recipe,
    RawMaterial,
    RawMaterialUnit,
    AdminProductVariantResponse,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    Select,
    Textarea,
    Modal,
    toast,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Plus,
    Trash2,
    TrendingUp,
    CheckCircle2,
    Cpu,
    Calendar,
    Sparkles,
    Scale,
    Layers,
    Save,
    History,
    AlertTriangle,
} from "lucide-react";

const UNITS: Array<{ label: string; value: RawMaterialUnit }> = [
    { label: "kg", value: "kg" },
    { label: "g", value: "g" },
    { label: "l", value: "l" },
    { label: "ml", value: "ml" },
    { label: "pcs", value: "pcs" },
    { label: "pack", value: "pack" },
];

interface IngredientRow {
    rawMaterialId: string;
    quantity: string;
    unit: RawMaterialUnit;
    wastagePercent: string;
}

interface PackagingRow {
    rawMaterialId: string;
    quantity: string;
    unit: RawMaterialUnit;
}

interface RecipeBuilderProps {
    initialRecipe?: Recipe | null;
    isEditing?: boolean;
}

export function RecipeBuilder({ initialRecipe, isEditing = false }: RecipeBuilderProps) {
    const router = useRouter();

    // Catalog state
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [code, setCode] = useState(initialRecipe?.code || "");
    const [name, setName] = useState(initialRecipe?.name || "");
    const [productId, setProductId] = useState(initialRecipe?.productId || "");
    const [variantId, setVariantId] = useState(initialRecipe?.variantId || "");
    const [shelfLifeDays, setShelfLifeDays] = useState(initialRecipe?.shelfLifeDays?.toString() || "30");
    const [yieldQty, setYieldQty] = useState(initialRecipe?.batchYield?.quantity?.toString() || "10");
    const [yieldUnit, setYieldUnit] = useState(initialRecipe?.batchYield?.unit || "boxes");
    const [laborOverhead, setLaborOverhead] = useState(initialRecipe?.laborOverheadCost?.toString() || "0");
    const [instructions, setInstructions] = useState(initialRecipe?.instructions || "");
    const [changeLog, setChangeLog] = useState("");
    const [bumpVersion, setBumpVersion] = useState(false);

    // Dynamic rows
    const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
        if (initialRecipe?.ingredients && initialRecipe.ingredients.length > 0) {
            return initialRecipe.ingredients.map((i) => ({
                rawMaterialId: i.rawMaterialId,
                quantity: i.quantity.toString(),
                unit: i.unit,
                wastagePercent: (i.wastagePercent || 0).toString(),
            }));
        }
        return [{ rawMaterialId: "", quantity: "1", unit: "kg", wastagePercent: "0" }];
    });

    const [packaging, setPackaging] = useState<PackagingRow[]>(() => {
        if (initialRecipe?.packagingMaterials && initialRecipe.packagingMaterials.length > 0) {
            return initialRecipe.packagingMaterials.map((p) => ({
                rawMaterialId: p.rawMaterialId,
                quantity: p.quantity.toString(),
                unit: p.unit,
            }));
        }
        return [];
    });

    // Costing Switcher in Sidebar Widget
    const [costingStrategy, setCostingStrategy] = useState<"WAC" | "HIGHEST">("WAC");

    // Sync to Variant Cost Modal
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [matsData, prodsRes] = await Promise.all([
                api.manufacturing.listRawMaterials(),
                api.products.list({ limit: 100 }),
            ]);
            setMaterials(matsData || []);
            setProducts(prodsRes.items || []);

            if (!productId && prodsRes.items && prodsRes.items.length > 0) {
                setProductId(prodsRes.items[0].id);
            }
        } catch (err) {
            console.error("Failed to load builder prerequisites:", err);
            toast.error("Failed to load catalog data.");
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const selectedProduct = useMemo(() => {
        return products.find((p) => p.id === productId);
    }, [products, productId]);

    const variants = useMemo(() => {
        return selectedProduct?.variants || [];
    }, [selectedProduct]);

    const selectedVariant = useMemo(() => {
        if (variantId) {
            return variants.find((v: any) => v.id === variantId);
        }
        return variants[0];
    }, [variants, variantId]);

    const sellingPrice = useMemo(() => {
        return selectedVariant?.prices?.[0]?.amount || 0;
    }, [selectedVariant]);

    // Add / Remove rows
    const addIngredientRow = () => {
        setIngredients((prev) => [
            ...prev,
            { rawMaterialId: materials[0]?.id || "", quantity: "1", unit: "kg", wastagePercent: "0" },
        ]);
    };

    const removeIngredientRow = (index: number) => {
        setIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const addPackagingRow = () => {
        const pkgMaterials = materials.filter((m) => m.category === "PACKAGING");
        const defaultId = pkgMaterials[0]?.id || materials[0]?.id || "";
        setPackaging((prev) => [...prev, { rawMaterialId: defaultId, quantity: "1", unit: "pcs" }]);
    };

    const removePackagingRow = (index: number) => {
        setPackaging((prev) => prev.filter((_, i) => i !== index));
    };

    // Live Calculation Engine
    const calculation = useMemo(() => {
        let totalIngredientsWac = 0;
        let totalIngredientsHighest = 0;
        let totalPackagingWac = 0;
        let totalPackagingHighest = 0;

        // Helper for unit conversion multiplier
        const toBaseMultiplier = (qty: number, fromUnit: RawMaterialUnit, baseUnit: RawMaterialUnit) => {
            const f = fromUnit.toLowerCase();
            const b = baseUnit.toLowerCase();
            if (f === b) return qty;
            if (f === "g" && b === "kg") return qty / 1000;
            if (f === "kg" && b === "g") return qty * 1000;
            if (f === "ml" && b === "l") return qty / 1000;
            if (f === "l" && b === "ml") return qty * 1000;
            return qty;
        };

        for (const ing of ingredients) {
            const qty = parseFloat(ing.quantity) || 0;
            const waste = (parseFloat(ing.wastagePercent) || 0) / 100;
            const effectiveQty = qty * (1 + waste);
            const rm = materials.find((m) => m.id === ing.rawMaterialId);
            if (!rm) continue;

            const baseQty = toBaseMultiplier(effectiveQty, ing.unit, rm.unit);
            totalIngredientsWac += baseQty * (rm.averageCost || 0);
            totalIngredientsHighest += baseQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        for (const pkg of packaging) {
            const qty = parseFloat(pkg.quantity) || 0;
            const rm = materials.find((m) => m.id === pkg.rawMaterialId);
            if (!rm) continue;

            const baseQty = toBaseMultiplier(qty, pkg.unit, rm.unit);
            totalPackagingWac += baseQty * (rm.averageCost || 0);
            totalPackagingHighest += baseQty * (rm.lastPurchasePrice || rm.averageCost || 0);
        }

        const overhead = parseFloat(laborOverhead) || 0;
        const totalBatchWac = totalIngredientsWac + totalPackagingWac + overhead;
        const totalBatchHighest = totalIngredientsHighest + totalPackagingHighest + overhead;

        const yieldCount = parseFloat(yieldQty) || 1;
        const unitCostWac = yieldCount > 0 ? totalBatchWac / yieldCount : totalBatchWac;
        const unitCostHighest = yieldCount > 0 ? totalBatchHighest / yieldCount : totalBatchHighest;

        const activeUnitCost = costingStrategy === "WAC" ? unitCostWac : unitCostHighest;
        const activeTotalBatch = costingStrategy === "WAC" ? totalBatchWac : totalBatchHighest;
        const grossMarginPercent = sellingPrice > 0 ? ((sellingPrice - activeUnitCost) / sellingPrice) * 100 : 0;

        return {
            ingredientsSubtotal: costingStrategy === "WAC" ? totalIngredientsWac : totalIngredientsHighest,
            packagingSubtotal: costingStrategy === "WAC" ? totalPackagingWac : totalPackagingHighest,
            overheadSubtotal: overhead,
            totalBatchCost: Math.round(activeTotalBatch * 100) / 100,
            unitCost: Math.round(activeUnitCost * 100) / 100,
            unitCostWac: Math.round(unitCostWac * 100) / 100,
            unitCostHighest: Math.round(unitCostHighest * 100) / 100,
            grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
        };
    }, [ingredients, packaging, laborOverhead, yieldQty, materials, costingStrategy, sellingPrice]);

    const handleSaveRecipe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !name.trim() || !productId) {
            toast.error("Please fill in Recipe Code, Name, and Finished Product.");
            return;
        }

        const validIngredients = ingredients
            .filter((i) => i.rawMaterialId && parseFloat(i.quantity) > 0)
            .map((i) => ({
                rawMaterialId: i.rawMaterialId,
                quantity: parseFloat(i.quantity),
                unit: i.unit,
                wastagePercent: parseFloat(i.wastagePercent) || 0,
            }));

        if (validIngredients.length === 0) {
            toast.error("Please add at least one valid ingredient.");
            return;
        }

        const validPackaging = packaging
            .filter((p) => p.rawMaterialId && parseFloat(p.quantity) > 0)
            .map((p) => ({
                rawMaterialId: p.rawMaterialId,
                quantity: parseFloat(p.quantity),
                unit: p.unit,
            }));

        setIsSaving(true);
        try {
            if (isEditing && initialRecipe) {
                const res = await api.manufacturing.updateRecipe(initialRecipe.id, {
                    name: name.trim(),
                    shelfLifeDays: parseInt(shelfLifeDays, 10) || 30,
                    batchYield: {
                        quantity: parseFloat(yieldQty) || 1,
                        unit: yieldUnit.trim(),
                    },
                    ingredients: validIngredients,
                    packagingMaterials: validPackaging,
                    laborOverheadCost: parseFloat(laborOverhead) || 0,
                    instructions: instructions.trim() || undefined,
                    changeLog: changeLog.trim() || undefined,
                    bumpVersion,
                });
                toast.success(bumpVersion ? `Bumped recipe to v${res.version}!` : "Recipe updated successfully!");
                router.push("/recipes");
            } else {
                await api.manufacturing.createRecipe({
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    productId,
                    variantId: variantId || undefined,
                    shelfLifeDays: parseInt(shelfLifeDays, 10) || 30,
                    batchYield: {
                        quantity: parseFloat(yieldQty) || 1,
                        unit: yieldUnit.trim(),
                    },
                    ingredients: validIngredients,
                    packagingMaterials: validPackaging,
                    laborOverheadCost: parseFloat(laborOverhead) || 0,
                    instructions: instructions.trim() || undefined,
                    changeLog: changeLog.trim() || "Initial recipe formulation",
                });
                toast.success("Recipe formulated successfully!");
                router.push("/recipes");
            }
        } catch (err: unknown) {
            console.error("Failed to save recipe:", err);
            const msg = err instanceof Error ? err.message : "Failed to save recipe.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSyncCostToVariant = async () => {
        if (!selectedProduct || !selectedVariant) {
            toast.error("No product or variant selected.");
            return;
        }

        setIsSyncing(true);
        try {
            await api.manufacturing.syncVariantCost({
                productId: selectedProduct.id,
                variantId: selectedVariant.id,
                costAmount: calculation.unitCost,
                currency: selectedProduct.baseCurrency || "INR",
            });
            toast.success(
                `Synced production cost ₹${calculation.unitCost.toFixed(2)} to ${selectedProduct.title} (${selectedVariant.title})!`
            );
            setIsSyncModalOpen(false);
        } catch (err: unknown) {
            console.error("Failed to sync cost:", err);
            const msg = err instanceof Error ? err.message : "Failed to sync cost.";
            toast.error(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-28">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading recipe formula engine...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSaveRecipe} className="space-y-6 pb-24 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/recipes"
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {isEditing ? `Edit Recipe: ${name || code}` : "Formulate New Recipe (BOM)"}
                            </h1>
                            {isEditing && initialRecipe && (
                                <Badge variant="primary" size="sm">
                                    v{initialRecipe.version}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Define raw material composition, cooking loss/wastage, packaging, and shelf life
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Link href="/recipes">
                        <Button type="button" variant="outline" size="sm">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSaving}
                        className="gap-1.5 font-bold px-4"
                    >
                        {isSaving ? <Spinner size="sm" /> : <Save size={14} />}
                        <span>{isEditing ? (bumpVersion ? "Bump to Next Version" : "Save Changes") : "Create Recipe"}</span>
                    </Button>
                </div>
            </div>

            {/* Layout: Main Form Left (2/3) + Sticky Live Cost Widget Right (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Recipe Form Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Recipe Information */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Layers size={16} className="text-blue-600" />
                            <span>1. Recipe & Finished Product Assignment</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Recipe Code / SKU" required>
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="e.g. RCP-JAMUN-500G"
                                    className="font-mono text-xs uppercase"
                                    disabled={isEditing}
                                    required
                                />
                            </FormField>

                            <FormField label="Recipe Name" required>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Traditional Gulab Jamun (500g Pack)"
                                    className="text-xs"
                                    required
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Target Finished Product" required>
                                <Select
                                    value={productId}
                                    onChange={(e) => {
                                        setProductId(e.target.value);
                                        setVariantId("");
                                    }}
                                    options={products.map((p) => ({
                                        label: `${p.title} (${p.slug})`,
                                        value: p.id,
                                    }))}
                                    disabled={isEditing}
                                />
                            </FormField>

                            <FormField label="Product Variant (Optional)">
                                <Select
                                    value={variantId}
                                    onChange={(e) => setVariantId(e.target.value)}
                                    options={[
                                        { label: "Default / All Variants", value: "" },
                                        ...variants.map((v: any) => ({
                                            label: `${v.title} (SKU: ${v.sku})`,
                                            value: v.id,
                                        })),
                                    ]}
                                    disabled={isEditing}
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-1">
                            <FormField label="Batch Output Yield" required>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0.001"
                                    value={yieldQty}
                                    onChange={(e) => setYieldQty(e.target.value)}
                                    placeholder="10"
                                    className="font-mono text-xs"
                                    required
                                />
                            </FormField>

                            <FormField label="Yield Unit" required>
                                <Input
                                    value={yieldUnit}
                                    onChange={(e) => setYieldUnit(e.target.value)}
                                    placeholder="boxes / packs"
                                    className="text-xs"
                                    required
                                />
                            </FormField>

                            <FormField label="Shelf Life (Days)" required>
                                <Input
                                    type="number"
                                    min="1"
                                    value={shelfLifeDays}
                                    onChange={(e) => setShelfLifeDays(e.target.value)}
                                    placeholder="30"
                                    className="font-mono text-xs"
                                    required
                                />
                            </FormField>
                        </div>
                    </Card>

                    {/* Ingredients Section */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Scale size={16} className="text-emerald-600" />
                                    <span>2. Raw Material Ingredients</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Specify exact ingredient quantities and optional cooking loss/moisture shrinkage percentage
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addIngredientRow}
                                className="gap-1 text-xs h-7"
                            >
                                <Plus size={12} />
                                <span>Add Ingredient</span>
                            </Button>
                        </div>

                        <div className="space-y-2.5">
                            {ingredients.map((row, idx) => {
                                const rm = materials.find((m) => m.id === row.rawMaterialId);
                                const unitRate = costingStrategy === "WAC" ? (rm?.averageCost || 0) : (rm?.lastPurchasePrice || rm?.averageCost || 0);

                                return (
                                    <div
                                        key={idx}
                                        className="p-3 bg-slate-50/80 dark:bg-neutral-900/60 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                                    >
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Raw Material
                                            </label>
                                            <Select
                                                value={row.rawMaterialId}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const found = materials.find((m) => m.id === val);
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) =>
                                                            i === idx
                                                                ? { ...r, rawMaterialId: val, unit: found ? found.unit : r.unit }
                                                                : r
                                                        )
                                                    );
                                                }}
                                                options={materials.map((m) => ({
                                                    label: `${m.name} (${m.unit})`,
                                                    value: m.id,
                                                }))}
                                            />
                                        </div>

                                        <div className="w-28">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Quantity
                                            </label>
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0.001"
                                                value={row.quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                                                    );
                                                }}
                                                className="text-xs font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Unit
                                            </label>
                                            <Select
                                                value={row.unit}
                                                onChange={(e) => {
                                                    const val = e.target.value as RawMaterialUnit;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, unit: val } : r))
                                                    );
                                                }}
                                                options={UNITS}
                                            />
                                        </div>

                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1" title="Cooking / moisture evaporation loss percentage">
                                                Wastage %
                                            </label>
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0"
                                                max="100"
                                                value={row.wastagePercent}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setIngredients((prev) =>
                                                        prev.map((r, i) => (i === idx ? { ...r, wastagePercent: val } : r))
                                                    );
                                                }}
                                                placeholder="0"
                                                className="text-xs font-mono"
                                            />
                                        </div>

                                        <div className="w-24 text-right">
                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                Unit Rate
                                            </label>
                                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
                                                ₹{unitRate.toFixed(2)}
                                            </span>
                                        </div>

                                        {ingredients.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeIngredientRow(idx)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors mt-auto mb-1"
                                                title="Remove ingredient"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Packaging Materials Section */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles size={16} className="text-purple-600" />
                                    <span>3. Packaging Materials (Boxes, Pouches, Labels)</span>
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Packaging items consumed per batch to reflect true Cost of Goods Sold (COGS)
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addPackagingRow}
                                className="gap-1 text-xs h-7"
                            >
                                <Plus size={12} />
                                <span>Add Packaging</span>
                            </Button>
                        </div>

                        {packaging.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 text-center">
                                <p className="text-xs text-slate-400">
                                    No packaging materials added yet. Click &quot;Add Packaging&quot; to include boxes or labels.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {packaging.map((row, idx) => {
                                    const rm = materials.find((m) => m.id === row.rawMaterialId);
                                    const unitRate = costingStrategy === "WAC" ? (rm?.averageCost || 0) : (rm?.lastPurchasePrice || rm?.averageCost || 0);

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 bg-slate-50/80 dark:bg-neutral-900/60 rounded-xl border border-slate-200 dark:border-neutral-800 flex items-center gap-3"
                                        >
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Packaging Item
                                                </label>
                                                <Select
                                                    value={row.rawMaterialId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, rawMaterialId: val } : r))
                                                        );
                                                    }}
                                                    options={materials.map((m) => ({
                                                        label: `${m.name} (${m.unit})`,
                                                        value: m.id,
                                                    }))}
                                                />
                                            </div>

                                            <div className="w-28">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Quantity
                                                </label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0.001"
                                                    value={row.quantity}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                                                        );
                                                    }}
                                                    className="text-xs font-mono"
                                                    required
                                                />
                                            </div>

                                            <div className="w-24">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Unit
                                                </label>
                                                <Select
                                                    value={row.unit}
                                                    onChange={(e) => {
                                                        const val = e.target.value as RawMaterialUnit;
                                                        setPackaging((prev) =>
                                                            prev.map((r, i) => (i === idx ? { ...r, unit: val } : r))
                                                        );
                                                    }}
                                                    options={UNITS}
                                                />
                                            </div>

                                            <div className="w-24 text-right">
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                                    Rate
                                                </label>
                                                <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300">
                                                    ₹{unitRate.toFixed(2)}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removePackagingRow(idx)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors mt-auto mb-1"
                                                title="Remove packaging item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Overheads & Instructions */}
                    <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            4. Overheads & Instructions
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Batch Overhead / Cooking Gas / Labor (₹)">
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={laborOverhead}
                                    onChange={(e) => setLaborOverhead(e.target.value)}
                                    placeholder="0.00"
                                    className="text-xs font-mono"
                                />
                            </FormField>

                            <FormField label="Version Changelog / Notes">
                                <Input
                                    value={changeLog}
                                    onChange={(e) => setChangeLog(e.target.value)}
                                    placeholder="e.g. Decreased sugar by 5%, added cardamom"
                                    className="text-xs"
                                />
                            </FormField>
                        </div>

                        <FormField label="Kitchen Preparation Steps / Cook Notes">
                            <Textarea
                                rows={3}
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="1. Boil milk slowly until 50% reduced. 2. Knead dough..."
                                className="text-xs"
                            />
                        </FormField>

                        {isEditing && (
                            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                                        Bump Version to v{(initialRecipe?.version || 1) + 1}?
                                    </span>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                                        Archives v{initialRecipe?.version} and creates a new immutable version for future production.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
                                    <input
                                        type="checkbox"
                                        checked={bumpVersion}
                                        onChange={(e) => setBumpVersion(e.target.checked)}
                                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Bump Version</span>
                                </label>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Side: Sticky Live Costing & Margin Widget */}
                <div className="space-y-4">
                    <div className="sticky top-20 space-y-4">
                        <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-blue-600" />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Live Cost Breakdown
                                    </h3>
                                </div>
                                <Badge variant="primary" size="sm">Real-Time</Badge>
                            </div>

                            {/* Mode Switcher */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Calculation Mode:
                                </label>
                                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setCostingStrategy("WAC")}
                                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                                            costingStrategy === "WAC"
                                                ? "bg-white dark:bg-[#151515] text-blue-600 shadow-xs"
                                                : "text-slate-500 hover:text-slate-900"
                                        }`}
                                    >
                                        WAC (Stock)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCostingStrategy("HIGHEST")}
                                        className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
                                            costingStrategy === "HIGHEST"
                                                ? "bg-white dark:bg-[#151515] text-rose-600 shadow-xs"
                                                : "text-slate-500 hover:text-slate-900"
                                        }`}
                                    >
                                        Highest / Replace
                                    </button>
                                </div>
                            </div>

                            {/* Cost Items */}
                            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-neutral-800/60 pt-1">
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Ingredients Subtotal:</span>
                                    <span className="font-mono font-semibold">₹{calculation.ingredientsSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Packaging Subtotal:</span>
                                    <span className="font-mono font-semibold">₹{calculation.packagingSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="text-slate-500">Batch Overhead / Gas:</span>
                                    <span className="font-mono font-semibold">₹{calculation.overheadSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t font-bold">
                                    <span className="text-slate-800 dark:text-slate-200">Total Batch Cost:</span>
                                    <span className="font-mono text-blue-600">₹{calculation.totalBatchCost.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Unit Cost Hero Display */}
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 text-center">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Estimated Cost per {yieldUnit || "Unit"}
                                </span>
                                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                                    ₹{calculation.unitCost.toFixed(2)}
                                </p>
                                <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400 mt-1.5">
                                    <span>WAC: ₹{calculation.unitCostWac.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>Highest: ₹{calculation.unitCostHighest.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Profit Margin Preview */}
                            {sellingPrice > 0 && (
                                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-neutral-900 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">Selling Price:</span>
                                        <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100">
                                            ₹{sellingPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">Gross Profit Margin:</span>
                                        <span className="font-mono font-extrabold text-emerald-600 text-sm">
                                            {calculation.grossMarginPercent}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsSyncModalOpen(true)}
                                    className="w-full text-xs font-semibold"
                                >
                                    Apply Cost to Product Variant
                                </Button>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    disabled={isSaving}
                                    className="w-full font-bold gap-2 text-xs"
                                >
                                    {isSaving ? <Spinner size="sm" /> : <Save size={14} />}
                                    <span>{isEditing ? (bumpVersion ? "Bump to Next Version" : "Save Formula") : "Save Recipe"}</span>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Sync Cost Confirmation Modal */}
            <Modal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                title="Sync Recipe Cost to Product Variant"
                maxWidth="md"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-600 dark:text-neutral-300">
                        This will update the cost price (<span className="font-mono font-bold">costAmount</span>) for:
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs space-y-1">
                        <p><span className="text-slate-400">Product:</span> <span className="font-bold">{selectedProduct?.title}</span></p>
                        <p><span className="text-slate-400">Variant:</span> <span className="font-bold">{selectedVariant?.title || "Default"}</span></p>
                        <p><span className="text-slate-400">Currency:</span> <span className="font-bold font-mono">{selectedProduct?.baseCurrency || "INR"}</span></p>
                        <p><span className="text-slate-400">New Cost Amount:</span> <span className="font-bold font-mono text-emerald-600">₹{calculation.unitCost.toFixed(2)}</span></p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSyncModalOpen(false)}
                            disabled={isSyncing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSyncCostToVariant}
                            disabled={isSyncing}
                            className="gap-1.5 font-bold"
                        >
                            {isSyncing && <Spinner size="sm" />}
                            <span>Confirm & Sync Cost</span>
                        </Button>
                    </div>
                </div>
            </Modal>
        </form>
    );
}
