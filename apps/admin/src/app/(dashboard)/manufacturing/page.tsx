"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    Modal,
    FormField,
    Select,
    Textarea,
    toast,
} from "@ecommers/ui";
import {
    Cpu,
    Plus,
    RefreshCw,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Calendar,
    CalendarCheck,
    Layers,
    Search,
    RotateCcw,
    Boxes,
    Scale,
    AlertCircle,
    Eye,
    Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
    ProductionRun,
    Recipe,
    ProductionFeasibilityCheck,
    LocationResponse,
} from "@ecommers/types";

export default function ManufacturingPage() {
    const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Modal: View Batch Details
    const [viewingBatch, setViewingBatch] = useState<ProductionRun | null>(null);

    // Modal: Reverse Batch
    const [reversingBatch, setReversingBatch] = useState<ProductionRun | null>(null);
    const [reversalReason, setReversalReason] = useState("");
    const [submittingReversal, setSubmittingReversal] = useState(false);

    // Load initial data
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [runsData, recipesData, locationsData] = await Promise.all([
                api.manufacturing.listProductionRuns(),
                api.manufacturing.listRecipes(),
                api.locations.adminList().catch(() => []),
            ]);

            setProductionRuns(runsData);
            setRecipes(recipesData);
            setLocations(locationsData || []);
        } catch (err: unknown) {
            console.error("Failed to load manufacturing data:", err);
            toast.error("Failed to load manufacturing runs.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filtered runs
    const filteredRuns = productionRuns.filter((run) => {
        const matchesStatus = statusFilter === "ALL" || run.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
            !q ||
            run.batchNumber.toLowerCase().includes(q) ||
            (run.recipeName && run.recipeName.toLowerCase().includes(q)) ||
            (run.productTitle && run.productTitle.toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
    });

    // KPI Aggregations
    const completedRuns = productionRuns.filter((r) => r.status === "COMPLETED");
    const totalYieldUnits = completedRuns.reduce((acc, r) => acc + (r.actualQuantity || 0), 0);
    const totalProductionCost = completedRuns.reduce((acc, r) => acc + (r.actualTotalCost || 0), 0);
    const reversedCount = productionRuns.filter((r) => r.status === "REVERSED").length;

    // Handle Batch Reversal
    const handleConfirmReversal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reversingBatch) return;
        if (!reversalReason.trim()) {
            toast.error("Please provide a reversal reason for the audit ledger.");
            return;
        }

        setSubmittingReversal(true);
        try {
            await api.manufacturing.reverseProduction(reversingBatch.id, {
                reason: reversalReason.trim(),
            });

            toast.success(`Batch ${reversingBatch.batchNumber} has been successfully reversed.`);
            setReversingBatch(null);
            setReversalReason("");
            loadData(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to reverse production batch.";
            toast.error(msg);
        } finally {
            setSubmittingReversal(false);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Cpu className="text-emerald-600" size={26} />
                        Production Batches & Manufacturing
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
                        Execute production batches, consume lots via FEFO, deposit finished goods, and manage audited reversals.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-600" : ""} />
                        Refresh
                    </Button>
                    <Link href="/manufacturing/new">
                        <Button
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            <Plus size={15} />
                            Produce New Batch
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                            Completed Batches
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                            {completedRuns.length}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5 font-medium">runs</span>
                    </div>
                </Card>

                <Card className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                            Manufactured Units
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <Boxes size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                            {totalYieldUnits.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5 font-medium">finished units</span>
                    </div>
                </Card>

                <Card className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                            Realized Cost Value
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                            ₹{totalProductionCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </Card>

                <Card className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                            Batch Reversals
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                            <RotateCcw size={18} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                            {reversedCount}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5 font-medium">audited reverses</span>
                    </div>
                </Card>
            </div>

            {/* Quick Actions & Navigation Pill Bar */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-neutral-900/60 rounded-2xl border border-slate-200 dark:border-neutral-800 text-xs">
                <span className="font-semibold px-2 text-slate-500">Quick Links:</span>
                <Link href="/raw-materials">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 font-medium hover:text-emerald-600 shadow-xs inline-flex items-center gap-1.5">
                        <Boxes size={13} /> Raw Materials Catalog
                    </span>
                </Link>
                <Link href="/raw-materials/lots">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 font-medium hover:text-emerald-600 shadow-xs inline-flex items-center gap-1.5">
                        <CalendarCheck size={13} /> Active Lots (FEFO)
                    </span>
                </Link>
                <Link href="/recipes">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 font-medium hover:text-emerald-600 shadow-xs inline-flex items-center gap-1.5">
                        <Scale size={13} /> Recipes & BOM
                    </span>
                </Link>
                <Link href="/raw-materials/ledger">
                    <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 font-medium hover:text-emerald-600 shadow-xs inline-flex items-center gap-1.5">
                        <Layers size={13} /> Raw Stock Ledger
                    </span>
                </Link>
            </div>

            {/* Main Table Card */}
            <Card className="p-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                {/* Search & Status Filter */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <Input
                            placeholder="Search by batch #, recipe, product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs text-slate-500 font-medium">Status:</span>
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-neutral-800 p-1">
                            {["ALL", "COMPLETED", "REVERSED"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                        statusFilter === st
                                            ? "bg-white dark:bg-neutral-700 text-slate-900 dark:text-white shadow-xs"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <Spinner size="lg" className="text-emerald-600" />
                        <span className="text-xs text-slate-500">Loading production history...</span>
                    </div>
                ) : filteredRuns.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <Cpu className="mx-auto mb-3 opacity-30 text-slate-400" size={40} />
                        <p className="font-semibold text-sm">No production batches found.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {searchQuery || statusFilter !== "ALL"
                                ? "No batches match your selected search or filter criteria."
                                : "Start by creating a recipe, ensure raw materials are in stock, and click 'Produce New Batch'."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-neutral-800 text-slate-400 uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-3 font-semibold">Batch # & Date</th>
                                    <th className="py-3 px-3 font-semibold">Recipe & Version</th>
                                    <th className="py-3 px-3 font-semibold">Output Product</th>
                                    <th className="py-3 px-3 font-semibold text-right">Yield Qty</th>
                                    <th className="py-3 px-3 font-semibold text-right">Actual Unit Cost</th>
                                    <th className="py-3 px-3 font-semibold text-right">Total Cost</th>
                                    <th className="py-3 px-3 font-semibold text-center">Best Before</th>
                                    <th className="py-3 px-3 font-semibold text-center">Status</th>
                                    <th className="py-3 px-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                {filteredRuns.map((run) => {
                                    const isReversed = run.status === "REVERSED";
                                    const bestBeforeDate = run.expiryDate
                                        ? new Date(run.expiryDate).toLocaleDateString("en-IN", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "—";

                                    return (
                                        <tr
                                            key={run.id}
                                            className={`hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                                                isReversed ? "opacity-60 bg-rose-50/20" : ""
                                            }`}
                                        >
                                            {/* Batch # & Date */}
                                            <td className="py-3 px-3">
                                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                    {run.batchNumber}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Calendar size={11} />
                                                    {new Date(run.manufacturingDate || run.createdAt || "").toLocaleDateString("en-IN", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </div>
                                            </td>

                                            {/* Recipe & Version */}
                                            <td className="py-3 px-3">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {run.recipeName || "Recipe"}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    Version {run.recipeVersion} ({run.recipeCode || "BOM"})
                                                </div>
                                            </td>

                                            {/* Output Product */}
                                            <td className="py-3 px-3">
                                                <div className="font-medium text-slate-800 dark:text-neutral-200">
                                                    {run.productTitle || "Finished Product"}
                                                </div>
                                                {run.variantTitle && (
                                                    <div className="text-[11px] text-slate-400">
                                                        Variant: {run.variantTitle}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Yield Qty */}
                                            <td className="py-3 px-3 text-right">
                                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                    {run.actualQuantity} {run.yieldUnit}
                                                </span>
                                            </td>

                                            {/* Actual Unit Cost */}
                                            <td className="py-3 px-3 text-right">
                                                <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                    ₹{run.actualUnitCost.toFixed(2)}
                                                </div>
                                                {run.costVariance !== 0 && (
                                                    <div
                                                        className={`text-[10px] font-mono ${
                                                            run.costVariance > 0 ? "text-rose-500" : "text-emerald-500"
                                                        }`}
                                                    >
                                                        {run.costVariance > 0 ? "+" : ""}
                                                        ₹{run.costVariance.toFixed(2)} var
                                                    </div>
                                                )}
                                            </td>

                                            {/* Total Cost */}
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                ₹{run.actualTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {/* Best Before */}
                                            <td className="py-3 px-3 text-center">
                                                <span className="inline-flex items-center gap-1 font-mono text-slate-600 dark:text-neutral-300 text-[11px]">
                                                    <Clock size={11} className="text-amber-500" />
                                                    {bestBeforeDate}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-3 text-center">
                                                {run.status === "COMPLETED" ? (
                                                    <Badge variant="success" size="sm" className="font-semibold">
                                                        Completed
                                                    </Badge>
                                                ) : run.status === "REVERSED" ? (
                                                    <Badge variant="danger" size="sm" className="font-semibold">
                                                        Reversed
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" size="sm">
                                                        {run.status}
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setViewingBatch(run)}
                                                        className="h-7 text-[11px] px-2.5 flex items-center gap-1"
                                                    >
                                                        <Eye size={12} />
                                                        Details
                                                    </Button>

                                                    {run.status === "COMPLETED" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setReversingBatch(run)}
                                                            className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                                                            title="Reverse batch: restock raw materials and debit finished goods"
                                                        >
                                                            <RotateCcw size={12} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* ========================================================================= */}
            {/* Modal: View Batch Details                                                 */}
            {/* ========================================================================= */}
            <Modal
                isOpen={!!viewingBatch}
                onClose={() => setViewingBatch(null)}
                title={`Batch Details: ${viewingBatch?.batchNumber || ""}`}
                maxWidth="lg"
            >
                {viewingBatch && (
                    <div className="space-y-4 pt-1 text-xs">
                        {/* Status banner */}
                        {viewingBatch.status === "REVERSED" && viewingBatch.reversalDetails && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                                    <RotateCcw size={14} /> Batch Reversed
                                </div>
                                <p className="text-rose-600 dark:text-rose-300">
                                    <strong>Reversal Ref:</strong> {viewingBatch.reversalDetails.reversalReference}
                                </p>
                                <p className="text-rose-600 dark:text-rose-300">
                                    <strong>Reason:</strong> {viewingBatch.reversalDetails.reason}
                                </p>
                                <p className="text-[11px] text-rose-500">
                                    Reversed on {new Date(viewingBatch.reversalDetails.reversedAt).toLocaleString("en-IN")}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Recipe Formula</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {viewingBatch.recipeName} (v{viewingBatch.recipeVersion})
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Yield Output</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {viewingBatch.actualQuantity} {viewingBatch.yieldUnit} ({viewingBatch.productTitle})
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Manufacturing Date</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200">
                                    {new Date(viewingBatch.manufacturingDate).toLocaleDateString("en-IN")}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Best Before Date</span>
                                <span className="font-mono font-bold text-emerald-600">
                                    {new Date(viewingBatch.expiryDate).toLocaleDateString("en-IN")}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Actual Unit Cost</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    ₹{viewingBatch.actualUnitCost.toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Realized Cost</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    ₹{viewingBatch.actualTotalCost.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Consumed Lots Breakdown */}
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                                <Layers size={14} className="text-emerald-600" />
                                Exact Consumed Lots (FEFO Traceability):
                            </h4>
                            <div className="border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-400 text-[11px]">
                                        <tr>
                                            <th className="p-2.5">Material</th>
                                            <th className="p-2.5">Lot #</th>
                                            <th className="p-2.5">Lot Expiry</th>
                                            <th className="p-2.5 text-right">Quantity</th>
                                            <th className="p-2.5 text-right">Unit Cost</th>
                                            <th className="p-2.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                        {viewingBatch.lotsConsumed.map((lot, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2.5 font-medium">{lot.rawMaterialName || "Material"}</td>
                                                <td className="p-2.5 font-mono text-slate-500">{lot.lotNumber}</td>
                                                <td className="p-2.5 font-mono text-slate-500">
                                                    {new Date(lot.expiryDate).toLocaleDateString("en-IN")}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold">
                                                    {lot.quantity} {lot.unit}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-slate-500">
                                                    ₹{lot.costPerUnit.toFixed(2)}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                                                    ₹{(lot.quantity * lot.costPerUnit).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {viewingBatch.notes && (
                            <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Batch Notes:</span>
                                <p className="text-slate-700 dark:text-neutral-300">{viewingBatch.notes}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" onClick={() => setViewingBatch(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ========================================================================= */}
            {/* Modal: Reverse Production Batch                                           */}
            {/* ========================================================================= */}
            <Modal
                isOpen={!!reversingBatch}
                onClose={() => setReversingBatch(null)}
                title={`Reverse Batch: ${reversingBatch?.batchNumber || ""}`}
                maxWidth="md"
            >
                <form onSubmit={handleConfirmReversal} className="space-y-4 pt-1">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2 text-xs text-rose-800 dark:text-rose-300">
                        <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                            <AlertTriangle size={15} /> Confirm Batch Reversal
                        </div>
                        <p>
                            Reversing this production run will safely:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px]">
                            <li>Return all consumed raw materials back to their original specific lots.</li>
                            <li>Deduct <strong>{reversingBatch?.actualQuantity} {reversingBatch?.yieldUnit}</strong> of finished goods from store inventory.</li>
                            <li>Write contra-movements to the raw material stock ledger for complete auditing.</li>
                            <li>Mark this batch as REVERSED (cannot be undone).</li>
                        </ul>
                    </div>

                    <FormField label="Reason for Reversal" required>
                        <Textarea
                            required
                            placeholder="e.g., Operator error in yield entry; batch failed internal QC check."
                            value={reversalReason}
                            onChange={(e) => setReversalReason(e.target.value)}
                            rows={3}
                        />
                    </FormField>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReversingBatch(null)}
                            disabled={submittingReversal}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            disabled={submittingReversal || !reversalReason.trim()}
                            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
                        >
                            {submittingReversal && <Spinner size="sm" />}
                            Confirm Audit Reversal
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
