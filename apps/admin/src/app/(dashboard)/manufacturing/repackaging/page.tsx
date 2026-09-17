"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
    useGetRepackagingRunsQuery,
    useReverseRepackagingRunMutation,
} from "../../../../store/api";
import type { RepackagingRun } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    Modal,
    FormField,
    Pagination,
    toast,
} from "@ecommers/ui";
import {
    Layers,
    Plus,
    RefreshCw,
    Search,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Eye,
    Boxes,
    Package,
    ArrowLeft,
    Sparkles,
    Calendar,
    Tag,
} from "lucide-react";

export default function RepackagingDashboardPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const {
        data: runs = [],
        isLoading: loading,
        isFetching: refreshing,
        refetch,
    } = useGetRepackagingRunsQuery({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
    });

    const [reverseRepackagingRun, { isLoading: submittingReversal }] = useReverseRepackagingRunMutation();

    // Modal: View Details
    const [viewingRun, setViewingRun] = useState<RepackagingRun | null>(null);

    // Modal: Reverse Run
    const [reversingRun, setReversingRun] = useState<RepackagingRun | null>(null);
    const [reversalReason, setReversalReason] = useState("");
    const [reverseQuantity, setReverseQuantity] = useState("");

    const safeRuns = Array.isArray(runs) ? runs : [];

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = safeRuns.length;
        let totalUnits = 0;
        let totalCost = 0;
        let reversedCount = 0;

        for (const r of safeRuns) {
            if (r.status === "COMPLETED") {
                totalUnits += r.packageUnitsProduced || 0;
                totalCost += r.totalCost || 0;
            } else if (r.status === "REVERSED" || r.status === "PARTIALLY_REVERSED") {
                reversedCount++;
            }
        }

        return {
            total,
            totalUnits,
            totalCost: Math.round(totalCost),
            reversedCount,
        };
    }, [safeRuns]);

    const filteredRuns = useMemo(() => {
        return safeRuns.filter((r) => {
            const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery =
                !q ||
                r.runNumber.toLowerCase().includes(q) ||
                r.sourceRawMaterialName.toLowerCase().includes(q) ||
                r.sourceLotNumber.toLowerCase().includes(q) ||
                r.targetProductTitle.toLowerCase().includes(q);
            return matchesStatus && matchesQuery;
        });
    }, [safeRuns, statusFilter, searchQuery]);

    const totalItems = filteredRuns.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedRuns = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRuns.slice(start, start + pageSize);
    }, [filteredRuns, page, pageSize]);

    const handleReverseRun = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reversingRun) return;

        if (!reversalReason.trim()) {
            toast.error("Please provide an audited reason for reversal.");
            return;
        }

        try {
            await reverseRepackagingRun({
                id: reversingRun.id,
                body: {
                    reason: reversalReason.trim(),
                    reverseQuantity: reverseQuantity ? parseInt(reverseQuantity, 10) : undefined,
                },
            }).unwrap();

            toast.success(`Repackaging run ${reversingRun.runNumber} reversed. Stock restored!`);
            setReversingRun(null);
            setReversalReason("");
            setReverseQuantity("");
        } catch (err: unknown) {
            console.error("Failed to reverse repackaging run:", err);
            const msg = err instanceof Error ? err.message : "Failed to reverse run.";
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
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
                                Stock Repackaging & Transformation
                            </h1>
                            <Badge variant="primary" size="sm" className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                Bulk → Retail
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Transform bulk ingredients into consumer packages without double-counting inventory, preserving end-to-end lot traceability.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={refreshing}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </Button>
                    <Link href="/manufacturing/repackaging/new">
                        <Button
                            variant="primary"
                            size="sm"
                            className="gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Plus size={14} />
                            <span>Repackage Bulk Stock</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Total Runs</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                            <Layers size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{metrics.total}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Transformations</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Packs Produced</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                            <Package size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                        {metrics.totalUnits}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Finished retail units</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Valuation Transformed</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                            <Sparkles size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-2">
                        ₹{metrics.totalCost.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Material + packaging cost</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Reversals</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-500 flex items-center justify-center">
                            <RotateCcw size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-700 dark:text-neutral-300 mt-2">
                        {metrics.reversedCount}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Audited reversals</p>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by run #, source lot, material, or product..."
                        className="pl-8 text-xs h-9"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {(["ALL", "COMPLETED", "REVERSED"] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(st);
                                    setPage(1);
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    statusFilter === st
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-neutral-900"
                                        : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                                }`}
                            >
                                {st === "ALL" ? "All Runs" : st === "COMPLETED" ? "Completed" : "Reversed"}
                            </button>
                        ))}
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

            {/* Repackaging Runs Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2 font-medium">Loading repackaging runs...</p>
                    </div>
                ) : filteredRuns.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <Layers size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Repackaging Runs Found</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {searchQuery ? "No transformations match your filter." : "Transform your first bulk raw material into retail-ready product packs."}
                        </p>
                        <Link href="/manufacturing/repackaging/new">
                            <Button
                                variant="primary"
                                size="sm"
                                className="mt-4 gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus size={13} />
                                <span>Repackage Bulk Stock</span>
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="bg-slate-50/80 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800 text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Run # & Date</th>
                                        <th className="py-3 px-3">Source Bulk Material</th>
                                        <th className="py-3 px-3">Source Lot #</th>
                                        <th className="py-3 px-3">Target Retail Pack</th>
                                        <th className="py-3 px-3 text-right">Yield Output</th>
                                        <th className="py-3 px-3 text-right">Cost / Unit</th>
                                        <th className="py-3 px-3">Lot Expiry</th>
                                        <th className="py-3 px-3 text-center">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                    {paginatedRuns.map((r) => {
                                        const isReversed = r.status === "REVERSED";

                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                                        {r.runNumber}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                                                    </span>
                                                </td>

                                            <td className="py-3 px-3">
                                                <span className="font-semibold text-slate-900 dark:text-white block">
                                                    {r.sourceRawMaterialName}
                                                </span>
                                                <span className="font-mono text-[11px] text-slate-500">
                                                    {r.sourceQuantity} {r.sourceUnit} consumed
                                                </span>
                                            </td>

                                            <td className="py-3 px-3">
                                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px]">
                                                    {r.sourceLotNumber}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3">
                                                <span className="font-semibold text-slate-900 dark:text-white block">
                                                    {r.targetProductTitle}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {r.targetVariantTitle} ({r.unitSizeQuantity} {r.unitSizeUnit})
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                    {r.packageUnitsProduced}
                                                </span>
                                                <span className="text-[11px] text-slate-400 block">packs</span>
                                            </td>

                                            <td className="py-3 px-3 text-right">
                                                <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                                    ₹{r.unitCost.toFixed(2)}
                                                </span>
                                                <span className="font-mono text-[11px] text-slate-400">
                                                    Total ₹{r.totalCost.toFixed(2)}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 font-mono text-slate-600 dark:text-neutral-400">
                                                {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString("en-IN") : "—"}
                                            </td>

                                            <td className="py-3 px-3 text-center">
                                                {r.status === "COMPLETED" ? (
                                                    <Badge variant="success" size="sm">COMPLETED</Badge>
                                                ) : r.status === "PARTIALLY_REVERSED" ? (
                                                    <Badge variant="warning" size="sm">PARTIAL ({r.reversedUnits || 0}/{r.packageUnitsProduced})</Badge>
                                                ) : (
                                                    <Badge variant="danger" size="sm">REVERSED</Badge>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setViewingRun(r)}
                                                        className="h-7 text-[11px] px-2 text-slate-600"
                                                        title="View run details"
                                                    >
                                                        <Eye size={12} className="mr-1" />
                                                        Details
                                                    </Button>

                                                    {r.status !== "REVERSED" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setReversingRun(r)}
                                                            className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 border-rose-200"
                                                            title="Reverse transformation and restore bulk lot"
                                                        >
                                                            <RotateCcw size={12} className="mr-1" />
                                                            Reverse
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

            {/* Details Modal */}
            <Modal
                isOpen={!!viewingRun}
                onClose={() => setViewingRun(null)}
                title={`Repackaging Run: ${viewingRun?.runNumber || ""}`}
                maxWidth="md"
            >
                {viewingRun && (
                    <div className="space-y-4 pt-1 text-xs">
                        {viewingRun.reversalDetails && (
                            <div className={`p-3 rounded-xl ${viewingRun.reversalDetails.isPartial ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-200" : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200"} border`}>
                                <strong>{viewingRun.reversalDetails.isPartial ? `Partially Reversed (${viewingRun.reversalDetails.reversedQuantity} / ${viewingRun.packageUnitsProduced} packs)` : "Run Reversed"}:</strong> {viewingRun.reversalDetails.reason}
                                <span className="block text-[11px] opacity-75 mt-0.5">
                                    Reversed on {new Date(viewingRun.reversalDetails.reversedAt).toLocaleDateString("en-IN")} {viewingRun.reversalDetails.soldOrReservedAtReversal > 0 && `• Sold at Reversal: ${viewingRun.reversalDetails.soldOrReservedAtReversal} packs`}
                                </span>
                            </div>
                        )}

                        {viewingRun.wastageReport && (
                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                    <strong className="text-amber-900 dark:text-amber-200">Wastage / Shrinkage Report</strong>
                                    <Badge variant="warning" size="sm" className="text-[10px]">{viewingRun.wastageReport.wastageCategory}</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-[11px]">
                                    <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100">
                                        <span className="text-slate-400 text-[9px] block">Expected</span>
                                        <span>{viewingRun.wastageReport.expectedLossQuantity} {viewingRun.wastageReport.unit}</span>
                                    </div>
                                    <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100">
                                        <span className="text-slate-400 text-[9px] block">Actual</span>
                                        <span className="text-amber-600 font-bold">{viewingRun.wastageReport.actualLossQuantity} {viewingRun.wastageReport.unit}</span>
                                    </div>
                                    <div className="bg-white dark:bg-neutral-900 p-1.5 rounded-lg border border-amber-100">
                                        <span className="text-slate-400 text-[9px] block">Variance</span>
                                        <span className={`font-bold ${viewingRun.wastageReport.varianceQuantity > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                            {viewingRun.wastageReport.varianceQuantity > 0 ? "+" : ""}{viewingRun.wastageReport.varianceQuantity} {viewingRun.wastageReport.unit}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Source Bulk Material</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {viewingRun.sourceRawMaterialName}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Source Lot Number</span>
                                <span className="font-mono font-bold text-blue-600">
                                    {viewingRun.sourceLotNumber}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Target Consumer SKU</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {viewingRun.targetProductTitle}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Variant & Pack Size</span>
                                <span className="text-slate-700 dark:text-neutral-300">
                                    {viewingRun.targetVariantTitle} ({viewingRun.unitSizeQuantity} {viewingRun.unitSizeUnit})
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                <span className="text-slate-400 text-[10px] block">Bulk Consumed</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {viewingRun.sourceQuantity} {viewingRun.sourceUnit}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                <span className="text-slate-400 text-[10px] block">Packs Produced</span>
                                <span className="font-mono font-bold text-emerald-600">
                                    {viewingRun.packageUnitsProduced}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                                <span className="text-slate-400 text-[10px] block">Cost / Pack</span>
                                <span className="font-mono font-bold text-blue-600">
                                    ₹{viewingRun.unitCost.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {viewingRun.notes && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100">
                                <span className="text-slate-400 text-[11px] block">Operator Notes:</span>
                                <p className="text-slate-700 dark:text-neutral-300 mt-0.5">{viewingRun.notes}</p>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => setViewingRun(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reversal Confirmation Modal */}
            <Modal
                isOpen={!!reversingRun}
                onClose={() => setReversingRun(null)}
                title="Reverse Repackaging Run"
                maxWidth="sm"
            >
                {reversingRun && (
                    <form onSubmit={handleReverseRun} className="space-y-4 pt-1">
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-900 dark:text-amber-200 text-xs">
                            <strong>Warning:</strong> Reversing run <strong>{reversingRun.runNumber}</strong> will:
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                                <li>Debit {reversingRun.packageUnitsProduced} units from finished store inventory.</li>
                                <li>Restore {reversingRun.sourceQuantity} {reversingRun.sourceUnit} back to bulk lot <strong>{reversingRun.sourceLotNumber}</strong>.</li>
                                <li>Log audited contra-movements in both stock ledgers.</li>
                            </ul>
                        </div>

                        <FormField
                            label="Reversal Quantity (Packs)"
                            helperText={`Leave blank to reverse all unreversed packs (${reversingRun.packageUnitsProduced - (reversingRun.reversedUnits || 0)} packs), or enter unsold count for partial reversal`}
                        >
                            <Input
                                type="number"
                                min={1}
                                max={reversingRun.packageUnitsProduced - (reversingRun.reversedUnits || 0)}
                                placeholder="Full pack count"
                                value={reverseQuantity}
                                onChange={(e) => setReverseQuantity(e.target.value)}
                                className="text-xs"
                            />
                        </FormField>

                        <FormField label="Audited Reversal Reason" required helperText="Explain why this transformation is being reversed">
                            <Input
                                value={reversalReason}
                                onChange={(e) => setReversalReason(e.target.value)}
                                placeholder="e.g. Weight deviation or defective batch packaging seal"
                                required
                                className="text-xs"
                            />
                        </FormField>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setReversingRun(null)}
                                disabled={submittingReversal}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={submittingReversal}
                                className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                            >
                                {submittingReversal && <Spinner size="sm" />}
                                <span>Confirm Reversal</span>
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
