"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Modal,
    Button,
    Input,
    Badge,
    Spinner,
    FormField,
    Select,
    toast,
} from "@ecommers/ui";
import {
    Printer,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    Warehouse as WarehouseIcon,
    Scale,
    Sparkles,
    Cpu,
    ClipboardCheck,
    Clock,
    FileText,
    Boxes,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
    Recipe,
    ProductionFeasibilityCheck,
    LocationResponse,
} from "@ecommers/types";

interface BatchSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipe: Recipe | null;
    onBatchCreated?: (batchNumber: string) => void;
}

export function BatchSheetModal({
    isOpen,
    onClose,
    recipe,
    onBatchCreated,
}: BatchSheetModalProps) {
    const defaultBatchQty = recipe?.batchYield?.quantity || 1;
    const yieldUnit = recipe?.batchYield?.unit || "kg";

    // Scaling state
    const [targetQuantity, setTargetQuantity] = useState<number>(() => {
        // If 1 kg base formula, default to 100 kg for commercial convenience
        if (defaultBatchQty === 1 && (yieldUnit.toLowerCase() === "kg" || yieldUnit.toLowerCase() === "l")) {
            return 100;
        }
        return defaultBatchQty;
    });

    // Reset target quantity when recipe changes
    useEffect(() => {
        if (recipe) {
            const baseQty = recipe.batchYield?.quantity || 1;
            const unit = (recipe.batchYield?.unit || "kg").toLowerCase();
            if (baseQty === 1 && (unit === "kg" || unit === "l")) {
                setTargetQuantity(100);
            } else {
                setTargetQuantity(baseQty);
            }
        }
    }, [recipe]);

    // Production schedule state
    const [isSchedulingBatch, setIsSchedulingBatch] = useState(false);
    const [completionDate, setCompletionDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1); // Default to tomorrow
        return d.toISOString().split("T")[0]!;
    });
    const [manufacturingDate, setManufacturingDate] = useState<string>(
        new Date().toISOString().split("T")[0]!
    );
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [notes, setNotes] = useState("");
    const [submittingBatch, setSubmittingBatch] = useState(false);

    // Feasibility & Lot preview
    const [feasibility, setFeasibility] = useState<ProductionFeasibilityCheck | null>(null);
    const [loadingFeasibility, setLoadingFeasibility] = useState(false);

    // Load locations
    useEffect(() => {
        if (!isOpen) return;
        api.locations.adminList().then((locs) => {
            setLocations(locs || []);
            if (locs && locs.length > 0) {
                setSelectedWarehouseId(locs[0]!.id);
            }
        }).catch(() => {});
    }, [isOpen]);

    // Calculate scale multiplier
    const multiplier = useMemo(() => {
        if (!recipe) return 1;
        const baseQty = recipe.batchYield?.quantity || 1;
        return baseQty > 0 ? targetQuantity / baseQty : targetQuantity;
    }, [recipe, targetQuantity]);

    // Check feasibility when quantity changes
    const fetchFeasibility = useCallback(async () => {
        if (!recipe?.id || targetQuantity <= 0) return;
        setLoadingFeasibility(true);
        try {
            const check = await api.manufacturing.checkFeasibility(
                recipe.id,
                targetQuantity,
                manufacturingDate
            );
            setFeasibility(check);
        } catch (err) {
            console.warn("Feasibility preview warning:", err);
            setFeasibility(null);
        } finally {
            setLoadingFeasibility(false);
        }
    }, [recipe?.id, targetQuantity, manufacturingDate]);

    useEffect(() => {
        if (isOpen && recipe) {
            fetchFeasibility();
        }
    }, [isOpen, recipe, fetchFeasibility]);

    // Print action
    const handlePrint = () => {
        window.print();
    };

    // Confirm & Add to Production Batch
    const handleAddProductionBatch = async () => {
        if (!recipe) return;
        if (!recipe.id || recipe.id === "preview") {
            toast.error("Please save the recipe first before scheduling it into active production batches.");
            return;
        }
        if (!selectedWarehouseId) {
            toast.error("Please select a warehouse / production facility.");
            return;
        }

        setSubmittingBatch(true);
        try {
            const scheduledNotes = `[Target Completion: ${completionDate}] ${notes.trim()}`.trim();
            const res = await api.manufacturing.executeProduction({
                recipeId: recipe.id,
                warehouseId: selectedWarehouseId,
                plannedQuantity: targetQuantity,
                actualQuantity: targetQuantity,
                manufacturingDate,
                notes: scheduledNotes,
            });

            toast.success(`Production Batch ${res.batchNumber} created and recorded!`);
            if (onBatchCreated) {
                onBatchCreated(res.batchNumber);
            }
            onClose();
        } catch (err: unknown) {
            console.error("Failed to add production batch:", err);
            const msg = err instanceof Error ? err.message : "Failed to create production batch.";
            toast.error(msg);
        } finally {
            setSubmittingBatch(false);
        }
    };

    if (!recipe) return null;

    const quickPresets = yieldUnit.toLowerCase() === "kg" || yieldUnit.toLowerCase() === "l"
        ? [10, 25, 50, 100, 250, 500]
        : [10, 20, 50, 100, 200];

    const estimatedBatchCost = (recipe.estimatedCostWac || 0) * multiplier;
    const unitCost = recipe.estimatedCostWac || 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Production Batch Calculator & Work Order Slip"
            description="Real-time scaled BOM formula, raw material allocation, and factory work order slip"
            maxWidth="xl"
        >
            <div className="space-y-5 print:space-y-4">
                {/* Print-only Header (Hidden on screen, visible on paper) */}
                <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4 text-slate-900">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight uppercase">
                                Factory Work Order & Batch Sheet
                            </h1>
                            <p className="text-xs text-slate-600 font-mono mt-0.5">
                                FORMULA / BOM CODE: {recipe.code} (v{recipe.version})
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">TARGET BATCH OUTPUT</p>
                            <p className="text-xl font-mono font-black text-blue-700">
                                {targetQuantity} {yieldUnit}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs border border-slate-300 p-2 mt-3 rounded bg-slate-50">
                        <div>
                            <span className="text-slate-500 font-semibold block">Product:</span>
                            <span className="font-bold">{recipe.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Issue Date:</span>
                            <span className="font-bold">{manufacturingDate}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Target Completion:</span>
                            <span className="font-bold">{completionDate}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 font-semibold block">Base Multiplier:</span>
                            <span className="font-bold font-mono">{multiplier.toFixed(2)}x (Base: {recipe.batchYield.quantity} {recipe.batchYield.unit})</span>
                        </div>
                    </div>
                </div>

                {/* On-screen Scale Controller */}
                <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50/90 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-neutral-900/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 print:hidden space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Scale size={16} className="text-blue-600" />
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Target Batch Quantity to Produce
                                </h4>
                                <Badge variant="primary" size="sm" className="font-mono font-bold">
                                    {multiplier.toFixed(2)}x Scaling
                                </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                Enter the exact batch output your factory vat or kitchen team needs today. All raw materials calculate instantly.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrint}
                                className="gap-1.5 text-xs font-semibold shadow-xs bg-white dark:bg-neutral-800"
                            >
                                <Printer size={14} />
                                <span>Print Batch Slip</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-xs">
                            <span className="text-xs font-bold text-slate-500 pl-2">Produce:</span>
                            <Input
                                type="number"
                                step="any"
                                min="0.01"
                                value={targetQuantity}
                                onChange={(e) => setTargetQuantity(parseFloat(e.target.value) || 0)}
                                className="w-28 h-8 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-neutral-300 pr-2">
                                {yieldUnit}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
                            {quickPresets.map((qty) => (
                                <button
                                    key={qty}
                                    type="button"
                                    onClick={() => setTargetQuantity(qty)}
                                    className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${
                                        targetQuantity === qty
                                            ? "bg-blue-600 text-white shadow-xs"
                                            : "bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700"
                                    }`}
                                >
                                    {qty} {yieldUnit}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 border-t border-blue-200/50 dark:border-blue-900/30 pt-2 font-mono">
                        <span>Unit Est. Cost: ₹{unitCost.toFixed(2)} / {yieldUnit}</span>
                        <span className="font-bold text-slate-700 dark:text-neutral-200">
                            Total Batch Est. COGS: ₹{estimatedBatchCost.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Scaled Raw Materials Requirements Table */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                            <Boxes size={14} className="text-purple-600" />
                            <span>Raw Material Weighing Checklist ({recipe.ingredients.length} items)</span>
                        </h4>
                        {loadingFeasibility && (
                            <span className="text-[11px] text-blue-600 flex items-center gap-1">
                                <Spinner size="sm" />
                                <span>Allocating warehouse lots...</span>
                            </span>
                        )}
                    </div>

                    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-[#111111]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-500 font-semibold uppercase text-[10px]">
                                    <th className="py-2.5 px-3 w-8">#</th>
                                    <th className="py-2.5 px-3">Raw Material</th>
                                    <th className="py-2.5 px-3 text-right">Required Weight</th>
                                    <th className="py-2.5 px-3 text-center print:hidden">Stock Status</th>
                                    <th className="py-2.5 px-3 print:hidden">Recommended Lot (FEFO)</th>
                                    <th className="py-2.5 px-3 w-28 text-center hidden print:table-cell border-l border-slate-200">
                                        Actual Weighed
                                    </th>
                                    <th className="py-2.5 px-3 w-16 text-center hidden print:table-cell border-l border-slate-200">
                                        Check
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                {recipe.ingredients.map((ing: any, idx: number) => {
                                    const baseIngQty = ing.quantity || 0;
                                    const scaledQty = Math.round(baseIngQty * multiplier * 1000) / 1000;
                                    const wastagePercent = ing.wastagePercent || 0;
                                    const effectiveQty = wastagePercent > 0
                                        ? Math.round(scaledQty * (1 + wastagePercent / 100) * 1000) / 1000
                                        : scaledQty;

                                    const rmName = ing.rawMaterial?.name || ing.rawMaterialDetails?.name || (typeof ing.rawMaterialId === "object" ? ing.rawMaterialId?.name : "Raw Material");
                                    const rmCode = ing.rawMaterial?.code || ing.rawMaterialDetails?.code || (typeof ing.rawMaterialId === "object" ? ing.rawMaterialId?.code : "");
                                    const rmId = ing.rawMaterialId?._id?.toString() || ing.rawMaterialId?.toString() || ing.rawMaterial?.id;

                                    const shortage = feasibility?.shortages?.find((s: any) => s.rawMaterialId?.toString() === rmId);
                                    const allocation = feasibility?.fefoAllocations?.find((a: any) => a.rawMaterialId?.toString() === rmId);

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/20">
                                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="font-bold text-slate-900 dark:text-white block">
                                                    {rmName}
                                                </span>
                                                {rmCode && (
                                                    <span className="font-mono text-[10px] text-slate-400 block">
                                                        {rmCode}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono">
                                                <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                                                    {effectiveQty} {ing.unit}
                                                </span>
                                                {wastagePercent > 0 && (
                                                    <span className="text-[10px] text-slate-400 block">
                                                        (Net: {scaledQty} + {wastagePercent}% loss)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center print:hidden">
                                                {shortage ? (
                                                    <Badge variant="danger" size="sm" className="gap-1">
                                                        <AlertTriangle size={10} />
                                                        <span>Short by {shortage.deficit} {shortage.unit}</span>
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" size="sm" className="gap-1">
                                                        <CheckCircle2 size={10} />
                                                        <span>In Stock</span>
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 print:hidden">
                                                {allocation ? (
                                                    <div className="text-[11px] font-mono">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            Lot: {allocation.lotNumber}
                                                        </span>
                                                        <span className="text-slate-400 block text-[10px]">
                                                            Exp: {new Date(allocation.expiryDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] italic">FEFO Auto-Assign</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center hidden print:table-cell border-l border-slate-200 font-mono text-slate-400">
                                                _____ {ing.unit}
                                            </td>
                                            <td className="py-2.5 px-3 text-center hidden print:table-cell border-l border-slate-200 font-mono text-slate-400 text-base">
                                                &#x2610;
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Kitchen / Factory Instructions */}
                {recipe.instructions && (
                    <div className="p-3.5 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Preparation & Cooking Instructions:
                        </span>
                        <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                            {recipe.instructions}
                        </p>
                    </div>
                )}

                {/* Print Sign-Off Footer (Hidden on screen, printed on sheet) */}
                <div className="hidden print:grid grid-cols-3 gap-6 pt-10 mt-6 border-t-2 border-slate-900 text-xs text-slate-900">
                    <div className="space-y-6">
                        <p className="font-bold">WEIGHED & MIXED BY:</p>
                        <div className="border-b border-slate-400 pb-1 text-slate-400 font-mono">Signature / Name</div>
                        <p className="text-[10px] text-slate-500">Date: _______________</p>
                    </div>
                    <div className="space-y-6">
                        <p className="font-bold">QUALITY ASSURANCE VERIFIED:</p>
                        <div className="border-b border-slate-400 pb-1 text-slate-400 font-mono">QA Inspector Signature</div>
                        <p className="text-[10px] text-slate-500">Date: _______________</p>
                    </div>
                    <div className="space-y-6">
                        <p className="font-bold">BATCH COMPLETION TIME:</p>
                        <div className="border-b border-slate-400 pb-1 text-slate-400 font-mono">Time: ____:____ AM/PM</div>
                        <p className="text-[10px] text-slate-500">Actual Yield: ________ {yieldUnit}</p>
                    </div>
                </div>

                {/* Schedule in Production Workflow (Screen-only) */}
                <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xs print:hidden space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="text-emerald-600" size={17} />
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                    Add to Active Production Batch?
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                    Record this batch into your manufacturing schedule, assign facility, and lock raw material lots.
                                </p>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isSchedulingBatch}
                                onChange={(e) => setIsSchedulingBatch(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {isSchedulingBatch && (
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-neutral-800 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <FormField label="Manufacturing Date" required>
                                    <Input
                                        type="date"
                                        value={manufacturingDate}
                                        onChange={(e) => setManufacturingDate(e.target.value)}
                                        className="text-xs font-mono"
                                        required
                                    />
                                </FormField>

                                <FormField label="Target Completion Date" required>
                                    <Input
                                        type="date"
                                        value={completionDate}
                                        onChange={(e) => setCompletionDate(e.target.value)}
                                        className="text-xs font-mono"
                                        required
                                    />
                                </FormField>

                                <FormField label="Production Facility / Warehouse" required>
                                    <Select
                                        value={selectedWarehouseId}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                        options={locations.map((l) => ({
                                            label: `${l.name} (${l.type})`,
                                            value: l.id,
                                        }))}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Shift Notes & Operator Instructions">
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Morning shift batch #1. Ensure vat is preheated to 85°C."
                                    className="text-xs"
                                />
                            </FormField>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleAddProductionBatch}
                                    disabled={submittingBatch || targetQuantity <= 0}
                                    className="gap-1.5 font-bold shadow-xs"
                                >
                                    {submittingBatch ? <Spinner size="sm" /> : <Cpu size={14} />}
                                    <span>Confirm & Add to Production Schedule</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls (Screen-only) */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800 print:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        Close
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="gap-1.5 font-semibold"
                        >
                            <Printer size={14} />
                            <span>Print Work Order</span>
                        </Button>

                        {!isSchedulingBatch && (
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setIsSchedulingBatch(true)}
                                className="gap-1.5 font-bold shadow-xs"
                            >
                                <CheckCircle2 size={14} />
                                <span>Add to Production Batch</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
