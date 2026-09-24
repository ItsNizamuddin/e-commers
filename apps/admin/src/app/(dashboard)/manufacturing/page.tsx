"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    Pagination,
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
    ShieldAlert,
} from "lucide-react";
import {
    useGetProductionRunsQuery,
    useGetRecipesQuery,
    useGetAdminLocationsQuery,
    useReverseProductionRunMutation,
} from "@/store/api";
import type {
    ProductionRun,
    Recipe,
    ProductionFeasibilityCheck,
    LocationResponse,
} from "@ecommers/types";

export default function ManufacturingPage() {
    const {
        data: productionRuns = [],
        isLoading: runsLoading,
        isFetching: runsFetching,
        refetch: refetchRuns,
    } = useGetProductionRunsQuery();

    const {
        data: recipes = [],
        isLoading: recipesLoading,
        refetch: refetchRecipes,
    } = useGetRecipesQuery();

    const {
        data: locations = [],
        isLoading: locationsLoading,
        refetch: refetchLocations,
    } = useGetAdminLocationsQuery();

    const [reverseProductionRun, { isLoading: submittingReversal }] = useReverseProductionRunMutation();

    const loading = runsLoading || recipesLoading || locationsLoading;
    const refreshing = runsFetching;

    const refetchAll = () => {
        refetchRuns();
        refetchRecipes();
        refetchLocations();
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Modal: View Batch Details
    const [viewingBatch, setViewingBatch] = useState<ProductionRun | null>(null);

    // Modal: Reverse Batch
    const [reversingBatch, setReversingBatch] = useState<ProductionRun | null>(null);
    const [reversalReason, setReversalReason] = useState("");
    const [reverseQuantity, setReverseQuantity] = useState<string>("");

    const safeRuns = Array.isArray(productionRuns) ? productionRuns : [];

    // Filtered runs
    const filteredRuns = safeRuns.filter((run) => {
        const matchesStatus = statusFilter === "ALL" || run.status === statusFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
            !q ||
            run.batchNumber.toLowerCase().includes(q) ||
            (run.recipeName && run.recipeName.toLowerCase().includes(q)) ||
            (run.productTitle && run.productTitle.toLowerCase().includes(q));
        return matchesStatus && matchesQuery;
    });

    const totalItems = filteredRuns.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedRuns = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRuns.slice(start, start + pageSize);
    }, [filteredRuns, page, pageSize]);

    // KPI Aggregations
    const completedRuns = safeRuns.filter((r) => r.status === "COMPLETED");
    const totalYieldUnits = completedRuns.reduce((acc, r) => acc + (r.actualQuantity || 0), 0);
    const totalProductionCost = completedRuns.reduce((acc, r) => acc + (r.actualTotalCost || 0), 0);
    const reversedCount = safeRuns.filter((r) => r.status === "REVERSED" || r.status === "PARTIALLY_REVERSED").length;

    // Handle Batch Reversal
    const handleConfirmReversal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reversingBatch) return;
        if (!reversalReason.trim()) {
            toast.error("Please provide a reversal reason for the audit ledger.");
            return;
        }

        try {
            await reverseProductionRun({
                id: reversingBatch.id,
                body: {
                    reason: reversalReason.trim(),
                    reverseQuantity: reverseQuantity ? parseFloat(reverseQuantity) : undefined,
                },
            }).unwrap();

            toast.success(`Batch ${reversingBatch.batchNumber} has been successfully reversed.`);
            setReversingBatch(null);
            setReversalReason("");
            setReverseQuantity("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to reverse production batch.";
            toast.error(msg);
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
                        onClick={refetchAll}
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
            <Card className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm rounded-2xl overflow-hidden flex flex-col">
                {/* Search & Status Filter */}
                <div className="p-4 border-b border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <Input
                            placeholder="Search by batch #, recipe, product..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Status:</span>
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-neutral-800 p-1">
                                {["ALL", "COMPLETED", "REVERSED"].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => {
                                            setStatusFilter(st);
                                            setPage(1);
                                        }}
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

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
                            <span>Show</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>entries</span>
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
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[300px]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-slate-400 uppercase tracking-wider text-[11px]">
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
                                    {paginatedRuns.map((run) => {
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
                                                ) : run.status === "PARTIALLY_REVERSED" ? (
                                                    <Badge variant="warning" size="sm" className="font-semibold">
                                                        Partially Reversed ({run.reversedQuantity || 0}/{run.actualQuantity})
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

                                                    {(run.status === "COMPLETED" || run.status === "PARTIALLY_REVERSED") && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setReversingBatch(run)}
                                                            className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                                                            title="Reverse batch: restock raw materials and debit finished goods"
                                                        >
                                                            <RotateCcw size={12} />
                                                            <span className="sr-only">Reverse</span>
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

                    {totalItems > 0 && (
                        <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </>
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
                        {viewingBatch.reversalDetails && (
                            <div className={`p-3 ${viewingBatch.reversalDetails.isPartial ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200" : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200"} border rounded-xl space-y-1`}>
                                <div className="flex items-center gap-1.5 font-bold">
                                    <RotateCcw size={14} /> {viewingBatch.reversalDetails.isPartial ? `Partially Reversed (${viewingBatch.reversalDetails.reversedQuantity} / ${viewingBatch.actualQuantity} ${viewingBatch.yieldUnit})` : "Fully Reversed"}
                                </div>
                                <p className="text-[11px]">
                                    <strong>Reversal Ref:</strong> {viewingBatch.reversalDetails.reversalReference}
                                </p>
                                <p className="text-[11px]">
                                    <strong>Reason:</strong> {viewingBatch.reversalDetails.reason}
                                </p>
                                {viewingBatch.reversalDetails.soldOrReservedAtReversal > 0 && (
                                    <p className="text-[11px]">
                                        <strong>Sold / Reserved at Reversal:</strong> {viewingBatch.reversalDetails.soldOrReservedAtReversal} {viewingBatch.yieldUnit}
                                    </p>
                                )}
                                <p className="text-[10px] opacity-75">
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

                        {/* Wastage Variance & QA Expiry Audit */}
                        {(viewingBatch.wastageReport || viewingBatch.expiryDetermination) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {viewingBatch.wastageReport && (
                                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1">
                                                <Scale size={13} /> Wastage Variance Report
                                            </span>
                                            <Badge variant="warning" size="sm" className="text-[10px]">
                                                {viewingBatch.wastageReport.wastageCategory}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 text-center pt-1 font-mono text-[11px]">
                                            <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100 dark:border-amber-950">
                                                <span className="text-slate-400 text-[9px] block uppercase">Expected</span>
                                                <span className="font-bold text-slate-700 dark:text-neutral-300">
                                                    {viewingBatch.wastageReport.expectedLossQuantity} {viewingBatch.wastageReport.unit}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100 dark:border-amber-950">
                                                <span className="text-slate-400 text-[9px] block uppercase">Actual</span>
                                                <span className="font-bold text-amber-600">
                                                    {viewingBatch.wastageReport.actualLossQuantity} {viewingBatch.wastageReport.unit}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100 dark:border-amber-950">
                                                <span className="text-slate-400 text-[9px] block uppercase">Variance</span>
                                                <span className={`font-bold ${viewingBatch.wastageReport.varianceQuantity > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                    {viewingBatch.wastageReport.varianceQuantity > 0 ? "+" : ""}{viewingBatch.wastageReport.varianceQuantity} {viewingBatch.wastageReport.unit}
                                                </span>
                                            </div>
                                        </div>
                                        {viewingBatch.wastageReport.wastageNotes && (
                                            <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic">
                                                Note: {viewingBatch.wastageReport.wastageNotes}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {viewingBatch.expiryDetermination && (
                                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-blue-900 dark:text-blue-200 text-[11px] flex items-center gap-1">
                                                <Clock size={13} /> QA Expiry Audit
                                            </span>
                                            <Badge variant={viewingBatch.expiryDetermination.decisionType === "QA_OVERRIDE" ? "warning" : "info"} size="sm" className="text-[10px]">
                                                {viewingBatch.expiryDetermination.decisionType}
                                            </Badge>
                                        </div>
                                        <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-neutral-300">
                                            <p>
                                                <strong>Recipe Shelf Life:</strong> {viewingBatch.expiryDetermination.recipeShelfLifeDays ?? 30} days
                                            </p>
                                            {viewingBatch.expiryDetermination.shortestIngredientName && (
                                                <p>
                                                    <strong>Shortest Ingredient:</strong> {viewingBatch.expiryDetermination.shortestIngredientName} ({viewingBatch.expiryDetermination.shortestIngredientExpiryDate ? new Date(viewingBatch.expiryDetermination.shortestIngredientExpiryDate).toLocaleDateString("en-IN") : "N/A"})
                                                </p>
                                            )}
                                            {viewingBatch.expiryDetermination.qaApprovalNotes && (
                                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium pt-0.5">
                                                    QA Note: {viewingBatch.expiryDetermination.qaApprovalNotes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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

                        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                            <Link
                                href={`/manufacturing/traceability?query=${encodeURIComponent(viewingBatch.batchNumber)}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                <ShieldAlert size={14} />
                                <span>Trace Batch Genealogy & Recall →</span>
                            </Link>
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

                    <FormField
                        label={`Reversal Quantity (${reversingBatch?.yieldUnit || "units"})`}
                        helperText={`Leave blank to reverse all unreversed units (${reversingBatch ? reversingBatch.actualQuantity - (reversingBatch.reversedQuantity || 0) : 0} ${reversingBatch?.yieldUnit || ""}), or specify quantity to perform a partial reversal.`}
                    >
                        <Input
                            type="number"
                            min={0.001}
                            max={reversingBatch ? reversingBatch.actualQuantity - (reversingBatch.reversedQuantity || 0) : undefined}
                            step="any"
                            placeholder="Full batch quantity"
                            value={reverseQuantity}
                            onChange={(e) => setReverseQuantity(e.target.value)}
                        />
                    </FormField>

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
