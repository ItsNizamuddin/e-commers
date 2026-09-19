"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
    PackUnit,
    RawMaterialUnit,
    SyncPackagingMatrixInput,
    PackagingMatrixItemInput,
} from "@ecommers/types";
import {
    useGetPackagingMatrixQuery,
    useSyncPackagingMatrixMutation,
    useGetRecipesQuery,
    useGetRawMaterialsQuery,
} from "../../store/api";
import {
    Card,
    Badge,
    Button,
    Input,
    Select,
    Label,
    Spinner,
    toast,
} from "@ecommers/ui";
import {
    Layers,
    Plus,
    Trash2,
    Package,
    Sparkles,
    Calculator,
    AlertTriangle,
    TrendingUp,
    Check,
    RefreshCw,
    Info,
    CheckCircle2,
    Box,
    Percent,
} from "lucide-react";

export interface PackagingPricingMatrixProps {
    productId: string;
    productTitle: string;
    baseCurrency?: string;
    onVariantsSynced?: () => void;
}

interface PackagingMaterialRow {
    id: string;
    rawMaterialId: string;
    quantity: number;
    unit: RawMaterialUnit;
}

interface MatrixItemRow {
    id: string; // React key
    variantId?: string;
    title: string;
    sku: string;
    packQuantity: number;
    packUnit: PackUnit;
    masterFormulaId?: string;
    packagingMaterials: PackagingMaterialRow[];
    operationalOverheadMinor: number; // in paise
    targetMarginPercent: number; // e.g. 60
    customerSellingPriceMinor: number; // in paise
    compareAtPriceMinor?: number; // in paise
    barcode?: string;
    isDefault: boolean;
    isActive: boolean;
}

const COMMON_PACK_UNITS: { value: PackUnit; label: string }[] = [
    { value: "g", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "l", label: "Liters (L)" },
    { value: "pcs", label: "Pieces (pcs)" },
    { value: "pack", label: "Pack" },
];

const PACK_PRESETS = [
    { label: "+ 250 g Jar", quantity: 250, unit: "g" as PackUnit, title: "250 g Glass Jar", defaultMargin: 60 },
    { label: "+ 500 g Jar", quantity: 500, unit: "g" as PackUnit, title: "500 g Glass Jar", defaultMargin: 65 },
    { label: "+ 750 g Jar", quantity: 750, unit: "g" as PackUnit, title: "750 g Glass Jar", defaultMargin: 65 },
    { label: "+ 1 kg Tub", quantity: 1, unit: "kg" as PackUnit, title: "1 kg Food-grade Tub", defaultMargin: 60 },
    { label: "+ 5 kg Tin", quantity: 5, unit: "kg" as PackUnit, title: "5 kg Commercial Tin", defaultMargin: 50 },
];

// Density helper for live client-side preview
function convertPackQuantity(qty: number, from: PackUnit, to: string): number {
    const f = from.toLowerCase();
    const t = to.toLowerCase();
    if (f === t) return qty;
    if (f === "g" && t === "kg") return qty / 1000;
    if (f === "kg" && t === "g") return qty * 1000;
    if (f === "ml" && t === "l") return qty / 1000;
    if (f === "l" && t === "ml") return qty * 1000;
    // Cross-dimensional food density default (1g = 1ml, 1kg = 1L)
    if (f === "g" && t === "l") return qty / 1000;
    if (f === "kg" && t === "ml") return qty * 1000;
    if (f === "ml" && t === "kg") return qty / 1000;
    if (f === "l" && t === "g") return qty * 1000;
    return qty;
}

export function PackagingPricingMatrix({
    productId,
    productTitle,
    baseCurrency = "INR",
    onVariantsSynced,
}: PackagingPricingMatrixProps) {
    const { data: matrixData, isLoading: loadingMatrix, refetch } = useGetPackagingMatrixQuery(productId);
    const { data: recipes = [], isLoading: loadingRecipes } = useGetRecipesQuery();
    const { data: rawMaterials = [], isLoading: loadingMaterials } = useGetRawMaterialsQuery();
    const [syncPackagingMatrix, { isLoading: isSyncing }] = useSyncPackagingMatrixMutation();

    const [selectedFormulaId, setSelectedFormulaId] = useState<string>("");
    const [rows, setRows] = useState<MatrixItemRow[]>([]);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Filter packaging materials (jars, caps, lids, labels, boxes, seals)
    const packagingRawMaterials = useMemo(() => {
        return rawMaterials.filter(
            (rm) => rm.category === "PACKAGING" || rm.category === "OTHER"
        );
    }, [rawMaterials]);

    // Initialize rows from API matrix data once loaded
    useEffect(() => {
        if (matrixData && !hasInitialized) {
            setSelectedFormulaId(matrixData.defaultMasterFormulaId || "");

            if (matrixData.items && matrixData.items.length > 0) {
                const initialRows: MatrixItemRow[] = matrixData.items.map((item, idx) => ({
                    id: item.variantId || `row-${Math.random().toString(36).substring(2, 9)}`,
                    variantId: item.variantId,
                    title: item.title,
                    sku: item.sku,
                    packQuantity: item.packQuantity,
                    packUnit: item.packUnit,
                    masterFormulaId: item.masterFormulaId || matrixData.defaultMasterFormulaId,
                    packagingMaterials: item.packagingMaterials.map((p) => ({
                        id: `bom-${Math.random().toString(36).substring(2, 7)}`,
                        rawMaterialId: p.rawMaterialId,
                        quantity: p.quantity,
                        unit: (p.unit as RawMaterialUnit) || "pcs",
                    })),
                    operationalOverheadMinor: item.laborOverheadCostMinor || 0,
                    targetMarginPercent: item.targetMarginPercent || 60,
                    customerSellingPriceMinor: item.customerSellingPriceMinor || 0,
                    compareAtPriceMinor: item.compareAtPriceMinor,
                    barcode: item.barcode,
                    isDefault: idx === 0,
                    isActive: true,
                }));
                setRows(initialRows);
            }
            setHasInitialized(true);
        }
    }, [matrixData, hasInitialized]);

    // Active master formula details
    const selectedFormula = useMemo(() => {
        return recipes.find((r) => r.id === selectedFormulaId) || null;
    }, [recipes, selectedFormulaId]);

    const formulaUnitCostMinor = useMemo(() => {
        if (!selectedFormula) return matrixData?.defaultMasterFormulaUnitCostMinor || 0;
        return Math.round((selectedFormula.estimatedCostWac || 0) * 100);
    }, [selectedFormula, matrixData]);

    const formulaYieldUnit = selectedFormula?.batchYield?.unit || matrixData?.defaultMasterFormulaYieldUnit || "kg";

    // Lookup table for raw material costs in paise
    const materialCostMap = useMemo(() => {
        const map = new Map<string, { name: string; costMinor: number; unit: string }>();
        for (const rm of rawMaterials) {
            map.set(rm.id, {
                name: rm.name,
                costMinor: Math.round((rm.averageCost || 0) * 100),
                unit: rm.unit,
            });
        }
        return map;
    }, [rawMaterials]);

    // Helper to generate a clean SKU based on product title and pack
    const generateSku = (packQty: number, packUnit: string) => {
        const prefix = productTitle
            ? productTitle
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .slice(0, 4)
                  .toUpperCase()
            : "PRD";
        return `${prefix}-${packQty}${packUnit.toUpperCase()}`;
    };

    // Add preset pack row
    const handleAddPreset = (preset: (typeof PACK_PRESETS)[0]) => {
        const newSku = generateSku(preset.quantity, preset.unit);
        // Try to pre-select common packaging materials if available
        const defaultBOM: PackagingMaterialRow[] = [];
        const matchingContainer = packagingRawMaterials.find(
            (rm) =>
                rm.name.toLowerCase().includes(preset.title.toLowerCase().includes("jar") ? "jar" : "tub") ||
                rm.name.toLowerCase().includes("container")
        );
        if (matchingContainer) {
            defaultBOM.push({
                id: `bom-${Date.now()}-1`,
                rawMaterialId: matchingContainer.id,
                quantity: 1,
                unit: (matchingContainer.unit as RawMaterialUnit) || "pcs",
            });
        }

        const matchingLabel = packagingRawMaterials.find((rm) => rm.name.toLowerCase().includes("label"));
        if (matchingLabel && matchingLabel.id !== matchingContainer?.id) {
            defaultBOM.push({
                id: `bom-${Date.now()}-2`,
                rawMaterialId: matchingLabel.id,
                quantity: 1,
                unit: (matchingLabel.unit as RawMaterialUnit) || "pcs",
            });
        }

        const newRow: MatrixItemRow = {
            id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: preset.title,
            sku: newSku,
            packQuantity: preset.quantity,
            packUnit: preset.unit,
            masterFormulaId: selectedFormulaId || undefined,
            packagingMaterials: defaultBOM,
            operationalOverheadMinor: 800, // default ₹8.00 overhead in paise
            targetMarginPercent: preset.defaultMargin,
            customerSellingPriceMinor: 0,
            isDefault: rows.length === 0,
            isActive: true,
        };

        // Pre-compute suggested price as initial selling price
        const foodCostMinor = Math.round(
            convertPackQuantity(newRow.packQuantity, newRow.packUnit, formulaYieldUnit) * formulaUnitCostMinor
        );
        const pkgCostMinor = defaultBOM.reduce((sum, b) => {
            const m = materialCostMap.get(b.rawMaterialId);
            return sum + (m ? Math.round(m.costMinor * b.quantity) : 0);
        }, 0);
        const cogsMinor = foodCostMinor + pkgCostMinor + newRow.operationalOverheadMinor;
        const targetDecimal = (preset.defaultMargin || 60) / 100;
        const suggestedSellingMinor = targetDecimal < 1 ? Math.round(cogsMinor / (1 - targetDecimal)) : cogsMinor;
        newRow.customerSellingPriceMinor = suggestedSellingMinor;

        setRows((prev) => [...prev, newRow]);
    };

    const handleUpdateRow = (id: string, patch: Partial<MatrixItemRow>) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    };

    const handleRemoveRow = (id: string) => {
        setRows((prev) => prev.filter((r) => r.id !== id));
    };

    const handleAddMaterialToRow = (rowId: string) => {
        const defaultMat = packagingRawMaterials[0];
        if (!defaultMat) {
            toast.error("No packaging raw materials found. Create jars/labels under Raw Materials first.");
            return;
        }
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                return {
                    ...r,
                    packagingMaterials: [
                        ...r.packagingMaterials,
                        {
                            id: `bom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            rawMaterialId: defaultMat.id,
                            quantity: 1,
                            unit: (defaultMat.unit as RawMaterialUnit) || "pcs",
                        },
                    ],
                };
            })
        );
    };

    const handleUpdateMaterial = (
        rowId: string,
        materialIndex: number,
        patch: Partial<PackagingMaterialRow>
    ) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                const nextBOM = [...r.packagingMaterials];
                nextBOM[materialIndex] = { ...nextBOM[materialIndex], ...patch };
                return { ...r, packagingMaterials: nextBOM };
            })
        );
    };

    const handleRemoveMaterial = (rowId: string, materialIndex: number) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.id !== rowId) return r;
                return {
                    ...r,
                    packagingMaterials: r.packagingMaterials.filter((_, idx) => idx !== materialIndex),
                };
            })
        );
    };

    // Calculate live economics for a row
    const computeRowEconomics = (row: MatrixItemRow) => {
        const rowFormula = recipes.find((rec) => rec.id === (row.masterFormulaId || selectedFormulaId));
        const unitCostMinor = rowFormula
            ? Math.round((rowFormula.estimatedCostWac || 0) * 100)
            : formulaUnitCostMinor;
        const yieldUnit = rowFormula?.batchYield?.unit || formulaYieldUnit;

        const foodCostMinor = Math.round(
            convertPackQuantity(row.packQuantity, row.packUnit, yieldUnit) * unitCostMinor
        );

        const packagingCostMinor = row.packagingMaterials.reduce((acc, p) => {
            const m = materialCostMap.get(p.rawMaterialId);
            return acc + (m ? Math.round(m.costMinor * p.quantity) : 0);
        }, 0);

        const overheadMinor = row.operationalOverheadMinor || 0;
        const totalCogsMinor = foodCostMinor + packagingCostMinor + overheadMinor;

        const targetDecimal = (row.targetMarginPercent || 0) / 100;
        const suggestedSellingMinor =
            targetDecimal < 1 ? Math.round(totalCogsMinor / (1 - targetDecimal)) : totalCogsMinor;

        const actualSellingMinor = row.customerSellingPriceMinor || 0;
        const actualGrossProfitMinor = actualSellingMinor - totalCogsMinor;
        const actualMarginPercent =
            actualSellingMinor > 0 ? (actualGrossProfitMinor / actualSellingMinor) * 100 : 0;

        return {
            foodCostMinor,
            packagingCostMinor,
            overheadMinor,
            totalCogsMinor,
            suggestedSellingMinor,
            actualGrossProfitMinor,
            actualMarginPercent,
            isNegativeMargin: actualGrossProfitMinor < 0,
        };
    };

    // Sync to Store Catalog
    const handleSync = async () => {
        if (!selectedFormulaId) {
            toast.error("Please select a Master Bulk Formula for this product.");
            return;
        }

        if (rows.length === 0) {
            toast.error("Please configure at least one pack size before syncing to catalog.");
            return;
        }

        // Validate rows
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.title.trim()) {
                toast.error(`Pack #${i + 1} must have a title (e.g. 500 g Glass Jar).`);
                return;
            }
            if (!r.sku.trim()) {
                toast.error(`Pack "${r.title}" must have a unique SKU.`);
                return;
            }
            if (!r.packQuantity || r.packQuantity <= 0) {
                toast.error(`Pack "${r.title}" must have a positive quantity.`);
                return;
            }
            if (r.customerSellingPriceMinor <= 0) {
                toast.error(`Pack "${r.title}" must have a customer selling price greater than ₹0.`);
                return;
            }
        }

        const payload: SyncPackagingMatrixInput = {
            productId,
            defaultMasterFormulaId: selectedFormulaId,
            items: rows.map((r) => ({
                variantId: r.variantId,
                title: r.title.trim(),
                sku: r.sku.trim().toUpperCase(),
                packQuantity: Number(r.packQuantity),
                packUnit: r.packUnit,
                masterFormulaId: r.masterFormulaId || undefined,
                packagingMaterials: r.packagingMaterials.map((p) => ({
                    rawMaterialId: p.rawMaterialId,
                    quantity: Number(p.quantity),
                    unit: p.unit,
                })),
                laborOverheadCostMinor: Number(r.operationalOverheadMinor || 0),
                targetMarginPercent: Number(r.targetMarginPercent || 60),
                customerSellingPriceMinor: Number(r.customerSellingPriceMinor),
                compareAtPriceMinor: r.compareAtPriceMinor ? Number(r.compareAtPriceMinor) : undefined,
                barcode: r.barcode?.trim() || undefined,
            })),
        };

        try {
            const res = await syncPackagingMatrix({ productId, body: payload }).unwrap();
            toast.success(`Successfully synced ${res.items?.length || rows.length} pack variants to store catalog!`);
            refetch();
            if (onVariantsSynced) {
                onVariantsSynced();
            }
        } catch (err: any) {
            const msg = err?.data?.message || err?.message || "Failed to sync packaging matrix.";
            toast.error(msg);
        }
    };

    if (loadingMatrix || loadingRecipes || loadingMaterials) {
        return (
            <Card className="p-8 flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Loading Packaging & Pricing Matrix...
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
            {/* ---------------------------------------------------- */}
            {/* HEADER HUB: MASTER BULK FORMULA SELECTION */}
            {/* ---------------------------------------------------- */}
            <Card className="p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-neutral-800">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                            <Layers size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Packaging & Commercial Pricing Matrix
                                </h2>
                                <Badge variant="primary" size="sm">
                                    Domain Hub
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                                Connect your Master Bulk Production Recipe to retail packaging containers. Costs and margins are computed live from recipe ingredient WAC and container inventory.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="gap-1.5"
                        >
                            <RefreshCw size={13} />
                            <span>Refresh Costs</span>
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="gap-1.5 shadow-xs"
                        >
                            {isSyncing ? <Spinner size="sm" /> : <Sparkles size={13} />}
                            <span>Apply & Sync to Store Catalog</span>
                        </Button>
                    </div>
                </div>

                {/* Master Formula Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <Label className="text-xs font-semibold mb-1 block">Master Bulk Formula (Recipe)</Label>
                        <Select
                            value={selectedFormulaId}
                            onChange={(e) => setSelectedFormulaId(e.target.value)}
                            className="w-full text-xs"
                        >
                            <option value="">-- Select Master Formula --</option>
                            {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name} ({r.code})
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block">
                                Bulk Food Unit Cost
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                                ₹{(formulaUnitCostMinor / 100).toFixed(2)} / {formulaYieldUnit}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <Calculator size={15} />
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                        <div>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 block">
                                Configured Pack Sizes
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                                {rows.length} Pack Sizes Active
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <Box size={15} />
                        </div>
                    </div>
                </div>

                {/* Important notice badge */}
                <div className="mt-3.5 p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <Info size={14} className="shrink-0" />
                    <span>
                        <strong>Safe Catalog Synchronization:</strong> Clicking &ldquo;Apply &amp; Sync&rdquo; updates sellable SKUs, prices, and costs in the store catalog. It <strong>never</strong> modifies warehouse inventory balances. Finished packs are deposited only when execution runs occur in Stock Repackaging.
                    </span>
                </div>
            </Card>

            {/* ---------------------------------------------------- */}
            {/* QUICK PRESETS BAR */}
            {/* ---------------------------------------------------- */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-neutral-400 mr-1 flex items-center gap-1">
                    <Plus size={13} /> Quick Presets:
                </span>
                {PACK_PRESETS.map((preset) => (
                    <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddPreset(preset)}
                        className="text-xs bg-white dark:bg-[#151515] hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                        {preset.label}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        handleAddPreset({
                            label: "+ Custom",
                            quantity: 100,
                            unit: "g",
                            title: "Custom Pack Size",
                            defaultMargin: 60,
                        })
                    }
                    className="text-xs border-dashed text-slate-600 dark:text-neutral-400"
                >
                    + Custom Pack
                </Button>
            </div>

            {/* ---------------------------------------------------- */}
            {/* PACKAGING ROWS TABLE / CARDS */}
            {/* ---------------------------------------------------- */}
            {rows.length === 0 ? (
                <Card className="p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111]">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
                        <Package size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        No Pack Sizes Configured Yet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mt-1 mb-4">
                        Click one of the quick presets above (e.g. <strong>+ 250 g Jar</strong> or <strong>+ 500 g Jar</strong>) to establish your retail packs, packaging BOM, and target profit margins.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {rows.map((row, idx) => {
                        const eco = computeRowEconomics(row);

                        return (
                            <Card
                                key={row.id}
                                className={`p-4 transition-all bg-white dark:bg-[#111111] border ${
                                    eco.isNegativeMargin
                                        ? "border-red-300 dark:border-red-900/60"
                                        : "border-slate-200 dark:border-neutral-800 shadow-xs"
                                }`}
                            >
                                {/* Top Row Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center text-xs font-bold shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Input
                                                type="text"
                                                value={row.title}
                                                onChange={(e) => handleUpdateRow(row.id, { title: e.target.value })}
                                                placeholder="Pack Title (e.g. 500 g Glass Jar)"
                                                className="text-xs font-bold text-slate-900 dark:text-white w-48 sm:w-60 h-8"
                                            />
                                            <Input
                                                type="text"
                                                value={row.sku}
                                                onChange={(e) =>
                                                    handleUpdateRow(row.id, { sku: e.target.value.toUpperCase() })
                                                }
                                                placeholder="SKU (e.g. AVAKAYA-500G)"
                                                className="text-xs font-mono uppercase w-36 h-8"
                                            />
                                            {row.isDefault && (
                                                <Badge variant="success" size="sm">
                                                    Default Pack
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUpdateRow(row.id, { isDefault: !row.isDefault })}
                                            className="text-xs text-slate-500 h-8 px-2"
                                            title="Mark as default variant for this product"
                                        >
                                            {row.isDefault ? "Unset Default" : "Set as Default"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Body Grid: Pack Size + Packaging BOM + Economics */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
                                    {/* Left (Col 1-4): Pack Specs & Packaging BOM */}
                                    <div className="lg:col-span-6 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                                                    Net Quantity
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0.001"
                                                    value={row.packQuantity}
                                                    onChange={(e) =>
                                                        handleUpdateRow(row.id, {
                                                            packQuantity: parseFloat(e.target.value) || 0,
                                                        })
                                                    }
                                                    className="text-xs h-8 mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                                                    Unit
                                                </Label>
                                                <Select
                                                    value={row.packUnit}
                                                    onChange={(e) =>
                                                        handleUpdateRow(row.id, { packUnit: e.target.value as PackUnit })
                                                    }
                                                    className="text-xs h-8 mt-1 w-full"
                                                >
                                                    {COMMON_PACK_UNITS.map((u) => (
                                                        <option key={u.value} value={u.value}>
                                                            {u.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Packaging Materials BOM */}
                                        <div className="p-3 rounded-lg bg-slate-50/80 dark:bg-neutral-900/40 border border-slate-100 dark:border-neutral-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                                    <Box size={12} className="text-slate-400" />
                                                    Packaging BOM (Containers, Lids, Labels)
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleAddMaterialToRow(row.id)}
                                                    className="text-[11px] h-6 px-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                >
                                                    + Add Material
                                                </Button>
                                            </div>

                                            {row.packagingMaterials.length === 0 ? (
                                                <p className="text-[11px] text-slate-400 italic py-1">
                                                    No containers or labels linked. Click &ldquo;+ Add Material&rdquo; to add jars, caps, or pouches.
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {row.packagingMaterials.map((bom, bIdx) => {
                                                        const matInfo = materialCostMap.get(bom.rawMaterialId);
                                                        const lineCost = matInfo ? (matInfo.costMinor * bom.quantity) / 100 : 0;

                                                        return (
                                                            <div
                                                                key={bom.id}
                                                                className="flex items-center gap-2 bg-white dark:bg-[#151515] p-1.5 rounded border border-slate-200/80 dark:border-neutral-800 text-xs"
                                                            >
                                                                <Select
                                                                    value={bom.rawMaterialId}
                                                                    onChange={(e) =>
                                                                        handleUpdateMaterial(row.id, bIdx, {
                                                                            rawMaterialId: e.target.value,
                                                                        })
                                                                    }
                                                                    className="text-xs h-7 py-0 grow"
                                                                >
                                                                    {packagingRawMaterials.map((rm) => (
                                                                        <option key={rm.id} value={rm.id}>
                                                                            {rm.name} (WAC: ₹{((rm.averageCost || 0)).toFixed(2)})
                                                                        </option>
                                                                    ))}
                                                                </Select>
                                                                <div className="flex items-center gap-1 w-20 shrink-0">
                                                                    <Input
                                                                        type="number"
                                                                        step="any"
                                                                        min="0.1"
                                                                        value={bom.quantity}
                                                                        onChange={(e) =>
                                                                            handleUpdateMaterial(row.id, bIdx, {
                                                                                quantity: parseFloat(e.target.value) || 0,
                                                                            })
                                                                        }
                                                                        className="text-xs h-7 w-12 px-1 text-center"
                                                                    />
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {bom.unit}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 w-16 text-right shrink-0">
                                                                    ₹{lineCost.toFixed(2)}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveMaterial(row.id, bIdx)}
                                                                    className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 pt-2 mt-2 border-t border-slate-100 dark:border-neutral-800">
                                                <span>Total Packaging Materials:</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    ₹{(eco.packagingCostMinor / 100).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Operational Overhead (Labor & Packing) */}
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                                                Labor & Packing Overhead (₹)
                                            </Label>
                                            <div className="flex items-center gap-1 w-28">
                                                <span className="text-xs text-slate-400">₹</span>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    value={(row.operationalOverheadMinor / 100).toFixed(2)}
                                                    onChange={(e) =>
                                                        handleUpdateRow(row.id, {
                                                            operationalOverheadMinor: Math.round(
                                                                (parseFloat(e.target.value) || 0) * 100
                                                            ),
                                                        })
                                                    }
                                                    className="text-xs h-7 text-right"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right (Col 5-12): COGS Breakdown, Margin %, Selling Price & Live Profit */}
                                    <div className="lg:col-span-6 flex flex-col justify-between p-3.5 rounded-xl bg-slate-50/60 dark:bg-neutral-900/30 border border-slate-200/60 dark:border-neutral-800/80">
                                        <div className="space-y-2">
                                            {/* COGS breakdown badges */}
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-neutral-800">
                                                <span className="text-xs font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                                    <Calculator size={13} className="text-blue-500" />
                                                    Unit Cost (COGS)
                                                </span>
                                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                                    ₹{(eco.totalCogsMinor / 100).toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 py-1 text-[11px]">
                                                <div className="p-2 rounded bg-white dark:bg-[#151515] border border-slate-100 dark:border-neutral-800">
                                                    <span className="text-slate-400 block text-[10px]">Food Cost</span>
                                                    <span className="font-bold text-slate-800 dark:text-neutral-200">
                                                        ₹{(eco.foodCostMinor / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="p-2 rounded bg-white dark:bg-[#151515] border border-slate-100 dark:border-neutral-800">
                                                    <span className="text-slate-400 block text-[10px]">Packaging</span>
                                                    <span className="font-bold text-slate-800 dark:text-neutral-200">
                                                        ₹{(eco.packagingCostMinor / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="p-2 rounded bg-white dark:bg-[#151515] border border-slate-100 dark:border-neutral-800">
                                                    <span className="text-slate-400 block text-[10px]">Overhead</span>
                                                    <span className="font-bold text-slate-800 dark:text-neutral-200">
                                                        ₹{(eco.overheadMinor / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Target Margin & Suggested Price */}
                                            <div className="grid grid-cols-2 gap-3 pt-1">
                                                <div>
                                                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 flex items-center gap-1">
                                                        <Percent size={11} /> Target Margin %
                                                    </Label>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="99"
                                                            value={row.targetMarginPercent}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                handleUpdateRow(row.id, { targetMarginPercent: val });
                                                            }}
                                                            className="text-xs h-8 font-semibold text-blue-600"
                                                        />
                                                        <span className="text-xs text-slate-400">%</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-neutral-400 flex items-center gap-1">
                                                        <TrendingUp size={11} /> Suggested Price
                                                    </Label>
                                                    <div className="flex items-center justify-between h-8 mt-1 px-2.5 rounded-md bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
                                                        <span>₹{(eco.suggestedSellingMinor / 100).toFixed(2)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleUpdateRow(row.id, {
                                                                    customerSellingPriceMinor: eco.suggestedSellingMinor,
                                                                })
                                                            }
                                                            className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Commercial Store Price (Customer-Facing) */}
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <div>
                                                    <Label className="text-[11px] font-bold text-slate-800 dark:text-white">
                                                        Selling Price (₹) *
                                                    </Label>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-xs text-slate-400">₹</span>
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            value={(row.customerSellingPriceMinor / 100).toFixed(0)}
                                                            onChange={(e) =>
                                                                handleUpdateRow(row.id, {
                                                                    customerSellingPriceMinor: Math.round(
                                                                        (parseFloat(e.target.value) || 0) * 100
                                                                    ),
                                                                })
                                                            }
                                                            className="text-xs h-8 font-bold text-emerald-600 dark:text-emerald-400"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                                                        Compare At / MRP (₹)
                                                    </Label>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-xs text-slate-400">₹</span>
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={
                                                                row.compareAtPriceMinor
                                                                    ? (row.compareAtPriceMinor / 100).toFixed(0)
                                                                    : ""
                                                            }
                                                            onChange={(e) =>
                                                                handleUpdateRow(row.id, {
                                                                    compareAtPriceMinor: e.target.value
                                                                        ? Math.round(parseFloat(e.target.value) * 100)
                                                                        : undefined,
                                                                })
                                                            }
                                                            placeholder="Optional"
                                                            className="text-xs h-8"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Economics Pill */}
                                        <div
                                            className={`mt-3 p-2.5 rounded-lg flex items-center justify-between text-xs ${
                                                eco.isNegativeMargin
                                                    ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60"
                                                    : "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {eco.isNegativeMargin ? (
                                                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                                ) : (
                                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                                )}
                                                <span className="font-semibold">
                                                    {eco.isNegativeMargin ? "Selling below cost!" : "Net Margin:"}
                                                </span>
                                                <span className="font-extrabold">
                                                    {eco.actualMarginPercent.toFixed(1)}%
                                                </span>
                                            </div>
                                            <span className="font-bold">
                                                Profit: ₹{(eco.actualGrossProfitMinor / 100).toFixed(2)} / pack
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* BOTTOM SYNC ACTIONS BAR */}
            {/* ---------------------------------------------------- */}
            {rows.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Ready to Publish Packaging Matrix
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Synchronizes {rows.length} sellable SKUs, packaging specifications, and live COGS to the store catalog.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold gap-2 px-6 shadow-xs"
                    >
                        {isSyncing ? <Spinner size="sm" /> : <Check size={16} />}
                        <span>Apply & Sync to Store Catalog</span>
                    </Button>
                </div>
            )}
        </div>
    );
}
