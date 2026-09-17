"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useGetRecipesQuery,
    useGetAdminLocationsQuery,
    useCheckProductionFeasibilityQuery,
    useCreateProductionRunMutation,
} from "../../../../store/api";
import type {
    Recipe,
    ProductionFeasibilityCheck,
    LocationResponse,
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
    Cpu,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Calendar,
    Warehouse,
    TrendingUp,
    Scale,
    Boxes,
    Clock,
    Layers,
    Sparkles,
} from "lucide-react";

export default function NewProductionRunPage() {
    const router = useRouter();

    const { data: recipes = [], isLoading: recipesLoading } = useGetRecipesQuery();
    const { data: locations = [], isLoading: locationsLoading } = useGetAdminLocationsQuery();
    const [createProductionRun, { isLoading: isSubmitting }] = useCreateProductionRunMutation();

    const loadingData = recipesLoading || locationsLoading;

    // Form fields
    const [selectedRecipeId, setSelectedRecipeId] = useState("");
    const [plannedQuantity, setPlannedQuantity] = useState<number>(1);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [manufacturingDate, setManufacturingDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!selectedRecipeId && recipes.length > 0) {
            setSelectedRecipeId(recipes[0].id);
            setPlannedQuantity(recipes[0].batchYield.quantity || 1);
        }
    }, [recipes, selectedRecipeId]);

    useEffect(() => {
        if (!selectedWarehouseId && locations.length > 0) {
            setSelectedWarehouseId(locations[0].id);
        }
    }, [locations, selectedWarehouseId]);

    // Live Feasibility Query
    const {
        data: feasibility,
        isFetching: checkingFeasibility,
    } = useCheckProductionFeasibilityQuery(
        { recipeId: selectedRecipeId, plannedQuantity },
        { skip: !selectedRecipeId || plannedQuantity <= 0 }
    );

    const selectedRecipe = useMemo(() => {
        return recipes.find((r) => r.id === selectedRecipeId);
    }, [recipes, selectedRecipeId]);

    // Update yield quantity when recipe changes
    const handleRecipeChange = (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        const r = recipes.find((item) => item.id === recipeId);
        if (r) {
            setPlannedQuantity(r.batchYield.quantity || 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRecipeId) {
            toast.error("Please select a recipe.");
            return;
        }

        if (!selectedWarehouseId) {
            toast.error("Please select a deposit warehouse.");
            return;
        }

        if (plannedQuantity <= 0) {
            toast.error("Target quantity must be greater than 0.");
            return;
        }

        if (feasibility && !feasibility.canProduce) {
            toast.error("Cannot produce: insufficient raw material stock.");
            return;
        }

        try {
            await createProductionRun({
                recipeId: selectedRecipeId,
                warehouseId: selectedWarehouseId,
                plannedQuantity,
                actualQuantity: plannedQuantity,
                manufacturingDate: new Date(manufacturingDate).toISOString(),
                notes: notes.trim() || undefined,
            }).unwrap();

            toast.success("Production batch manufactured & deposited successfully!");
            router.push("/manufacturing");
        } catch (err: unknown) {
            console.error("Failed to execute production run:", err);
            const msg = err instanceof Error ? err.message : "Failed to execute production run.";
            toast.error(msg);
        }
    };

    if (loadingData) {
        return (
            <div className="flex flex-col items-center justify-center py-28 max-w-4xl mx-auto">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading recipes & warehouses...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header & Breadcrumb */}
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/manufacturing"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Produce New Batch Run
                            </h1>
                            <Badge variant="primary" size="sm">Manufacturing Run</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Execute automated recipe lot deduction (FEFO), cost variance analysis, and finished inventory credit.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Recipe & Production Parameters */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Cpu size={16} className="text-blue-600" />
                        <span>1. Recipe & Batch Parameters</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Target Recipe (Bill of Materials)" required>
                            <Select
                                value={selectedRecipeId}
                                onChange={(e) => handleRecipeChange(e.target.value)}
                                required
                                className="text-xs h-10 font-semibold"
                            >
                                {recipes.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} (v{r.version}) — Yield: {r.batchYield.quantity} {r.batchYield.unit}
                                    </option>
                                ))}
                            </Select>
                        </FormField>

                        <FormField label="Deposit Warehouse" required helperText="Location where finished product stock is credited">
                            <Select
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                required
                                className="text-xs h-10"
                            >
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.code})
                                    </option>
                                ))}
                            </Select>
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            label={`Target Production Output (${selectedRecipe?.batchYield?.unit || "units"})`}
                            required
                            helperText={`Standard formula yields ${selectedRecipe?.batchYield?.quantity || 1} ${selectedRecipe?.batchYield?.unit || "units"}`}
                        >
                            <Input
                                type="number"
                                step="any"
                                min="0.1"
                                value={plannedQuantity}
                                onChange={(e) => setPlannedQuantity(parseFloat(e.target.value) || 0)}
                                required
                                className="font-mono text-xs h-10 font-bold"
                            />
                        </FormField>

                        <FormField label="Manufacturing Date" required>
                            <Input
                                type="date"
                                value={manufacturingDate}
                                onChange={(e) => setManufacturingDate(e.target.value)}
                                required
                                className="font-mono text-xs h-10"
                            />
                        </FormField>
                    </div>

                    <FormField label="Batch Notes & Operator Remarks">
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Morning shift run, roasted at 160°C for 22 mins"
                            className="text-xs h-10"
                        />
                    </FormField>
                </Card>

                {/* 2. Live Pre-Flight Feasibility & FEFO Lot Allocation */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                            <Layers size={16} className="text-indigo-600" />
                            <span>2. Live Pre-Flight Stock Feasibility & FEFO Allocations</span>
                        </div>
                        {checkingFeasibility && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                <Spinner size="sm" />
                                <span>Evaluating lots...</span>
                            </div>
                        )}
                    </div>

                    {feasibility && (
                        <div className="space-y-4">
                            {/* Feasibility Alert Status */}
                            {feasibility.canProduce ? (
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                                                Feasible to Produce {plannedQuantity} {selectedRecipe?.batchYield?.unit}
                                            </h4>
                                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                                All ingredients & packaging have sufficient unexpired lots allocated via FEFO.
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="success" size="sm">Stock Verified</Badge>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                                    <div className="flex items-center gap-2 text-rose-900 dark:text-rose-100 font-bold text-xs">
                                        <XCircle size={18} className="text-rose-600 shrink-0" />
                                        <span>Insufficient Stock for Production Run</span>
                                    </div>
                                    <ul className="text-xs text-rose-700 dark:text-rose-300 list-disc list-inside space-y-1">
                                        {feasibility.shortages.map((s) => (
                                            <li key={s.rawMaterialId}>
                                                <strong>{s.rawMaterialName}:</strong> Need {s.required} {s.unit}, only {s.available} {s.unit} available (Short by {s.deficit} {s.unit}).
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Perishable Weakest-Link Shelf Life Warning */}
                            {feasibility.hasPerishableWarning && (
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
                                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-100">
                                            Perishable Ingredient Expiry Constraint
                                        </h4>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                            {feasibility.perishableWarningMessage}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Cost Breakdown Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                                    <span className="text-[11px] text-slate-400 block">Est. Unit Cost (WAC)</span>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                        ₹{feasibility.estimatedCostWac.toFixed(2)}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                                    <span className="text-[11px] text-slate-400 block">Est. Unit Cost (Highest)</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-neutral-300 text-sm">
                                        ₹{feasibility.estimatedCostHighest.toFixed(2)}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                                    <span className="text-[11px] text-slate-400 block">Best Before Expiry</span>
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                        {feasibility.recommendedBestBeforeDate.slice(0, 10)}
                                    </span>
                                </div>
                            </div>

                            {/* FEFO Lot Allocation Table */}
                            {feasibility.fefoAllocations.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                                        Allocated Raw Material Lots (FEFO Priority Order)
                                    </h4>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-500 font-semibold">
                                                    <th className="py-2.5 px-3">Raw Material</th>
                                                    <th className="py-2.5 px-3">Allocated Lot #</th>
                                                    <th className="py-2.5 px-3">Lot Expiry</th>
                                                    <th className="py-2.5 px-3 text-right">Quantity Consumed</th>
                                                    <th className="py-2.5 px-3 text-right">Cost Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                                {feasibility.fefoAllocations.map((a, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30">
                                                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                                                            {a.rawMaterialName}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                                            {a.lotNumber}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-neutral-400">
                                                            {a.expiryDate.slice(0, 10)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                                                            {a.allocatedQuantity} {a.unit}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                                                            ₹{a.costPerUnit.toFixed(2)} / {a.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Link href="/manufacturing">
                        <Button variant="outline" type="button" size="md">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        variant="primary"
                        type="submit"
                        size="md"
                        disabled={isSubmitting || Boolean(feasibility && !feasibility.canProduce)}
                        className="gap-2 px-6 font-semibold"
                    >
                        {isSubmitting ? "Manufacturing Batch..." : "Produce & Deposit Batch"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
