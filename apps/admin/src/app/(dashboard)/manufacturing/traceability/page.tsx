"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Modal,
    toast,
} from "@ecommers/ui";
import {
    Search,
    ShieldAlert,
    ShieldCheck,
    ArrowRight,
    ArrowDown,
    Boxes,
    Layers,
    Cpu,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    Building2,
    Factory,
    Store,
    Clock,
    RefreshCw,
    Printer,
    Download,
    AlertOctagon,
    Users,
    ShoppingBag,
    Truck,
    PackageCheck,
    Ban,
    FileSpreadsheet,
    FileWarning,
    Tag,
} from "lucide-react";
import {
    useGetLotTraceabilityQuery,
    useExecuteLotRecallMutation,
} from "../../../../store/api";
import { getAccessToken } from "../../../../lib/api";
import { PrintLabelModal } from "../../../../components/manufacturing/print-label-modal";
import type { FinishedGoodsLot, RecallOrderSummary } from "@ecommers/types";

function LotTraceabilityContent() {
    const searchParams = useSearchParams();
    const queryParam = searchParams.get("query") || "";

    const [searchInput, setSearchInput] = useState(queryParam);
    const [activeQuery, setActiveQuery] = useState(queryParam);

    // Modals & Actions State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [selectedLotForPrint, setSelectedLotForPrint] = useState<FinishedGoodsLot | null>(null);

    const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
    const [recallReason, setRecallReason] = useState("");
    const [recallScope, setRecallScope] = useState<"SPECIFIC_LOT" | "BATCH_WIDE">("SPECIFIC_LOT");
    const [recallNotes, setRecallNotes] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [selectedCohortTab, setSelectedCohortTab] = useState<"ALL" | "allocated" | "shipped" | "delivered" | "cancelledOrReturned">("ALL");

    useEffect(() => {
        if (queryParam && queryParam !== activeQuery) {
            setSearchInput(queryParam);
            setActiveQuery(queryParam);
        }
    }, [queryParam, activeQuery]);

    const {
        data: report,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
    } = useGetLotTraceabilityQuery(activeQuery, {
        skip: !activeQuery.trim(),
    });

    const [executeLotRecall, { isLoading: isRecalling }] = useExecuteLotRecallMutation();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchInput.trim();
        if (!trimmed) {
            toast.error("Please enter a lot number, batch number, or packaging run number.");
            return;
        }
        setActiveQuery(trimmed);
    };

    const handleRecallSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const lotId = report?.finishedGoodsLot?.id || (report?.entityType === "INGREDIENT_LOT" || report?.entityType === "BULK_LOT" ? report.entitySummary.id : null);
        if (!lotId) {
            toast.error("No valid lot identifier found to recall.");
            return;
        }
        if (!recallReason.trim()) {
            toast.error("Please provide a recall reason.");
            return;
        }

        try {
            const result = await executeLotRecall({
                lotId,
                body: {
                    reason: recallReason.trim(),
                    actionRequired: recallScope === "BATCH_WIDE" ? "Batch-wide recall & quarantine" : "Lot-specific recall & quarantine",
                    quarantineInventory: true,
                    notifyCustomers: true,
                    notes: recallNotes.trim() || undefined,
                },
            }).unwrap();

            toast.success(
                `Lot ${result.lotNumber} marked RECALLED. Quarantined remaining inventory & released unfulfilled orders.`
            );
            setIsRecallModalOpen(false);
            setRecallReason("");
            setRecallNotes("");
            refetch();
        } catch (err: any) {
            toast.error(err?.data?.error?.message || err?.message || "Failed to execute lot recall.");
        }
    };

    const handleExportCsv = async () => {
        if (!report?.queryIdentifier) return;
        setIsExporting(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
            const token = getAccessToken();
            const res = await fetch(
                `${baseUrl}/admin/manufacturing/traceability/${encodeURIComponent(report.queryIdentifier)}/export`,
                {
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                }
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error?.message || "Failed to download recall export");
            }

            const blob = await res.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `recall-audit-${report.queryIdentifier}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(downloadUrl);
            toast.success("Recall audit CSV exported successfully.");
        } catch (err: any) {
            toast.error(err?.message || "Failed to export recall CSV.");
        } finally {
            setIsExporting(false);
        }
    };

    const getEntityTypeLabel = (type: string) => {
        switch (type) {
            case "FINISHED_PACKAGING_RUN":
                return "Finished Goods Packaging Run";
            case "BULK_PRODUCTION_RUN":
                return "Bulk Production Cooking Batch";
            case "BULK_LOT":
                return "Intermediate Bulk Lot";
            case "INGREDIENT_LOT":
                return "Raw Ingredient / Packaging Lot";
            default:
                return type;
        }
    };

    const blastRadius = report?.impactedOrdersSummary || report?.forwardTrace?.impactedOrdersSummary;

    const printableLot: FinishedGoodsLot | null = React.useMemo(() => {
        if (!report) return null;
        if (report.finishedGoodsLot) return report.finishedGoodsLot;
        if (report.entitySummary) {
            return {
                id: report.entitySummary.id,
                lotNumber: report.entitySummary.codeOrNumber,
                packagingRunId: report.entitySummary.id,
                productId: "",
                variantId: "",
                warehouseId: "",
                lotQuantity: 1,
                allocatedQuantity: 0,
                consumedQuantity: 0,
                availableQuantity: 1,
                expiryDate: report.entitySummary.expiryDate || new Date().toISOString(),
                qualityStatus: (report.entitySummary.status as any) || "AVAILABLE",
                publicVerificationToken: `bv_${report.entitySummary.codeOrNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
                packedAt: report.entitySummary.date || new Date().toISOString(),
            };
        }
        return null;
    }, [report]);

    // Filter impacted orders by cohort tab
    const filteredOrders: RecallOrderSummary[] = React.useMemo(() => {
        if (!blastRadius) return [];
        if (selectedCohortTab === "allocated") return blastRadius.impactedOrders.allocated;
        if (selectedCohortTab === "shipped") return blastRadius.impactedOrders.shipped;
        if (selectedCohortTab === "delivered") return blastRadius.impactedOrders.delivered;
        if (selectedCohortTab === "cancelledOrReturned") return blastRadius.impactedOrders.cancelledOrReturned;
        return [
            ...blastRadius.impactedOrders.allocated,
            ...blastRadius.impactedOrders.shipped,
            ...blastRadius.impactedOrders.delivered,
            ...blastRadius.impactedOrders.cancelledOrReturned,
        ];
    }, [blastRadius, selectedCohortTab]);

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Badge variant="success" className="text-xs font-semibold">
                            Food Safety & Compliance Engine
                        </Badge>
                    </div>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                        Two-Way Rapid Recall & Lot Genealogy
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Perform instantaneous forward and backward genealogy traces. Trace backward from a customer-facing retail pack to farm harvest lots, or trace forward from a contaminated ingredient lot to every downstream batch, packaging run, and customer blast radius.
                    </p>
                </div>
            </div>

            {/* Search Card */}
            <Card className="p-6 border border-gray-200 shadow-sm">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by Lot # (e.g. LOT-2026-001), Batch # (e.g. BATCH-001), or Run # (e.g. PKG-001)..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-9 text-sm"
                        />
                    </div>
                    <Button type="submit" disabled={isLoading || isFetching} className="flex items-center gap-2">
                        {isLoading || isFetching ? <Spinner size="sm" /> : <Search className="h-4 w-4" />}
                        Trace Genealogy
                    </Button>
                </form>

                {/* Quick Helper Tips */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Supported Queries:</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Raw Material Lot #</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Bulk Cooking Batch #</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Intermediate Bulk Lot #</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">Retail Packaging Run #</span>
                </div>
            </Card>

            {/* Loading State */}
            {(isLoading || isFetching) && (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <Spinner size="lg" />
                    <p className="text-sm text-gray-500">Traversing manufacturing and inventory genealogy graph...</p>
                </div>
            )}

            {/* Error State */}
            {isError && !isLoading && (
                <Card className="p-8 text-center border-rose-200 bg-rose-50/60">
                    <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-rose-900">Traceability Record Not Found</h3>
                    <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">
                        {(error as any)?.data?.error?.message ||
                            `No manufacturing batch, intermediate bulk lot, or packaging run found matching identifier '${activeQuery}'.`}
                    </p>
                </Card>
            )}

            {/* Empty Initial State */}
            {!activeQuery && !isLoading && (
                <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Ready for Rapid Recall & Inspection</h3>
                    <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                        Enter a lot or batch number above to visualize the complete end-to-end food safety chain from supplier/farm to retail warehouse inventory.
                    </p>
                </div>
            )}

            {/* Trace Report Display */}
            {report && !isLoading && (
                <div className="space-y-6">
                    {/* Entity Summary Header */}
                    <Card className="p-6 border-l-4 border-l-primary bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="neutral" className="text-xs font-semibold">
                                        {getEntityTypeLabel(report.entityType)}
                                    </Badge>
                                    <Badge
                                        variant={
                                            report.entitySummary.status === "COMPLETED" || report.entitySummary.status === "AVAILABLE"
                                                ? "success"
                                                : report.entitySummary.status === "QUARANTINED" || report.entitySummary.status === "BLOCKED"
                                                ? "warning"
                                                : "danger"
                                        }
                                        className="text-xs"
                                    >
                                        {report.entitySummary.status}
                                    </Badge>
                                </div>
                                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
                                    {report.entitySummary.codeOrNumber}
                                </h2>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {report.entitySummary.nameOrTitle}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs sm:text-right">
                                <div>
                                    <span className="text-gray-500 block">Production / Intake Date</span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {report.entitySummary.date ? new Date(report.entitySummary.date).toLocaleDateString() : "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Expiry Date</span>
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                        {report.entitySummary.expiryDate
                                            ? new Date(report.entitySummary.expiryDate).toLocaleDateString()
                                            : "No Expiry"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
                            {printableLot && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedLotForPrint(printableLot);
                                        setIsPrintModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span>Print Batch QR Labels</span>
                                </Button>
                            )}

                            {report.queryIdentifier && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportCsv}
                                    disabled={isExporting}
                                    className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    <span>{isExporting ? "Exporting CSV..." : "Export Recall Audit (CSV)"}</span>
                                </Button>
                            )}

                            {report.finishedGoodsLot && report.finishedGoodsLot.qualityStatus !== "RECALLED" && (
                                <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setIsRecallModalOpen(true)}
                                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs"
                                >
                                    <AlertOctagon className="h-4 w-4" />
                                    <span>Emergency Lot Recall</span>
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Downstream Customer Blast Radius & Impacted Orders Section */}
                    {blastRadius && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                                        !
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        Commercial Customer Recall Blast Radius
                                    </h3>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    {blastRadius.totalImpactedOrders} orders • {blastRadius.totalImpactedCustomers} customers affected
                                </div>
                            </div>

                            {/* 4 Categorized Blast Radius Cohort Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Allocated */}
                                <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/30">
                                    <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                                        <span>1. Allocated (In-Packing)</span>
                                        <ShoppingBag className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-amber-950 font-mono">
                                        {blastRadius.cohortCounts.allocated}
                                    </div>
                                    <p className="mt-1 text-[11px] text-amber-700">
                                        Orders reserved in warehouse; auto-unallocated upon recall.
                                    </p>
                                </Card>

                                {/* Shipped */}
                                <Card className="p-4 border-l-4 border-l-indigo-500 bg-indigo-50/30">
                                    <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                                        <span>2. In Transit (Shipped)</span>
                                        <Truck className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-indigo-950 font-mono">
                                        {blastRadius.cohortCounts.shipped}
                                    </div>
                                    <p className="mt-1 text-[11px] text-indigo-700">
                                        Packages in courier custody; intercept courier delivery.
                                    </p>
                                </Card>

                                {/* Delivered (High Risk) */}
                                <Card className="p-4 border-l-4 border-l-rose-500 bg-rose-50/40">
                                    <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
                                        <span>3. In Customer Hands</span>
                                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-rose-950 font-mono">
                                        {blastRadius.cohortCounts.delivered}
                                    </div>
                                    <p className="mt-1 text-[11px] text-rose-700 font-medium">
                                        Delivered to end consumer; direct recall notices required.
                                    </p>
                                </Card>

                                {/* Cancelled / Restocked */}
                                <Card className="p-4 border-l-4 border-l-slate-400 bg-slate-50">
                                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                                        <span>4. Cancelled / Returned</span>
                                        <Ban className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                                        {blastRadius.cohortCounts.cancelledOrReturned}
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-600">
                                        Orders aborted before or after receipt; restocked or scrapped.
                                    </p>
                                </Card>
                            </div>

                            {/* Customer Orders Drill-down Table */}
                            {blastRadius.totalImpactedOrders > 0 && (
                                <Card className="p-5 border border-gray-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-gray-500" />
                                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                                Impacted Customer Order Details ({filteredOrders.length})
                                            </h4>
                                        </div>

                                        {/* Cohort Tabs */}
                                        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCohortTab("ALL")}
                                                className={`py-1 px-2.5 rounded-md transition-all ${
                                                    selectedCohortTab === "ALL"
                                                        ? "bg-white font-semibold text-gray-900 shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900"
                                                }`}
                                            >
                                                All ({blastRadius.totalImpactedOrders})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCohortTab("allocated")}
                                                className={`py-1 px-2.5 rounded-md transition-all ${
                                                    selectedCohortTab === "allocated"
                                                        ? "bg-white font-semibold text-amber-700 shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900"
                                                }`}
                                            >
                                                Allocated ({blastRadius.cohortCounts.allocated})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCohortTab("shipped")}
                                                className={`py-1 px-2.5 rounded-md transition-all ${
                                                    selectedCohortTab === "shipped"
                                                        ? "bg-white font-semibold text-indigo-700 shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900"
                                                }`}
                                            >
                                                Shipped ({blastRadius.cohortCounts.shipped})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCohortTab("delivered")}
                                                className={`py-1 px-2.5 rounded-md transition-all ${
                                                    selectedCohortTab === "delivered"
                                                        ? "bg-white font-semibold text-rose-700 shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900"
                                                }`}
                                            >
                                                Delivered ({blastRadius.cohortCounts.delivered})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCohortTab("cancelledOrReturned")}
                                                className={`py-1 px-2.5 rounded-md transition-all ${
                                                    selectedCohortTab === "cancelledOrReturned"
                                                        ? "bg-white font-semibold text-slate-700 shadow-xs"
                                                        : "text-gray-500 hover:text-gray-900"
                                                }`}
                                            >
                                                Cancelled ({blastRadius.cohortCounts.cancelledOrReturned})
                                            </button>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Order Number</TableHead>
                                                <TableHead className="text-xs">Customer Name & Email</TableHead>
                                                <TableHead className="text-xs">Lot Qty</TableHead>
                                                <TableHead className="text-xs">Fulfillment Status</TableHead>
                                                <TableHead className="text-xs">Order Status</TableHead>
                                                <TableHead className="text-xs">Allocated / Shipped</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredOrders.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-6 text-xs text-gray-500">
                                                        No orders in this cohort category.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredOrders.map((ord, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono font-bold text-xs text-indigo-600">
                                                            {ord.orderNumber}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <div className="font-medium text-gray-900">
                                                                {ord.customerName || "Customer"}
                                                            </div>
                                                            <div className="text-gray-500 text-[11px] font-mono">
                                                                {ord.customerEmail}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-bold text-gray-900">
                                                            {ord.quantity} units
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <Badge
                                                                variant={
                                                                    ord.fulfillmentStatus === "DELIVERED"
                                                                        ? "danger"
                                                                        : ord.fulfillmentStatus === "SHIPPED"
                                                                        ? "info"
                                                                        : ord.fulfillmentStatus === "PROCESSING"
                                                                        ? "warning"
                                                                        : "neutral"
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                {ord.fulfillmentStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <Badge variant="neutral" className="text-[10px]">
                                                                {ord.orderStatus}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-gray-600 font-mono text-[11px]">
                                                            {ord.shippedAt
                                                                ? `Shipped: ${new Date(ord.shippedAt).toLocaleDateString()}`
                                                                : ord.allocatedAt
                                                                ? `Alloc: ${new Date(ord.allocatedAt).toLocaleDateString()}`
                                                                : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Backward Genealogy Section */}
                    {report.backwardTrace && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                                    ←
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Backward Trace (Farm-to-Fork Root Cause Analysis)
                                </h3>
                            </div>

                            {/* Packaging Run Details */}
                            {report.backwardTrace.packagingRun && (
                                <Card className="p-5 border border-indigo-100 bg-indigo-50/40">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                                        <Layers className="h-4 w-4 text-indigo-600" />
                                        1. Packaging Stage (Repackaging Run)
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500 block">Run Number</span>
                                            <span className="font-mono font-bold text-gray-900">
                                                {report.backwardTrace.packagingRun.runNumber}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Packaged Variant</span>
                                            <span className="font-semibold text-gray-900">
                                                {report.backwardTrace.packagingRun.variantTitle}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Pack Units Produced</span>
                                            <span className="font-bold text-emerald-700">
                                                {report.backwardTrace.packagingRun.unitsProduced} units
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Packaging Date</span>
                                            <span className="font-medium text-gray-700">
                                                {new Date(report.backwardTrace.packagingRun.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Intermediate Bulk Lot & Production */}
                            {report.backwardTrace.bulkProduction && (
                                <Card className="p-5 border border-amber-100 bg-amber-50/40">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                                        <Cpu className="h-4 w-4 text-amber-600" />
                                        2. Cooking / Bulk Production Stage
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500 block">Bulk Batch Number</span>
                                            <span className="font-mono font-bold text-gray-900">
                                                {report.backwardTrace.bulkProduction.batchNumber}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Master Formula</span>
                                            <span className="font-semibold text-gray-900">
                                                {report.backwardTrace.bulkProduction.recipeName} (v{report.backwardTrace.bulkProduction.version})
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Bulk Yield Produced</span>
                                            <span className="font-bold text-gray-900">
                                                {report.backwardTrace.bulkProduction.actualQuantity} {report.backwardTrace.bulkProduction.yieldUnit}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Cooking Date</span>
                                            <span className="font-medium text-gray-700">
                                                {new Date(report.backwardTrace.bulkProduction.manufacturingDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Raw Ingredients Consumed Table */}
                            {report.backwardTrace.ingredientsConsumed && report.backwardTrace.ingredientsConsumed.length > 0 && (
                                <Card className="p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        <Boxes className="h-4 w-4 text-primary" />
                                        3. Agricultural Ingredients Consumed (Vendor & Farm Trace)
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Raw Material</TableHead>
                                                <TableHead className="text-xs">Lot Number</TableHead>
                                                <TableHead className="text-xs">Quantity Consumed</TableHead>
                                                <TableHead className="text-xs">Vendor / Supplier</TableHead>
                                                <TableHead className="text-xs">Farm / Plot Harvest</TableHead>
                                                <TableHead className="text-xs">Lot Expiry Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.backwardTrace.ingredientsConsumed.map((ing, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-xs">
                                                        {ing.rawMaterialName} ({ing.rawMaterialCode})
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {ing.lotNumber}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-gray-900">
                                                        {ing.quantityConsumed} {ing.unit}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {ing.supplierName || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {ing.farmName || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-emerald-700">
                                                        {ing.expiryDate ? new Date(ing.expiryDate).toLocaleDateString() : "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}

                            {/* Packaging BOM Consumed */}
                            {report.backwardTrace.packagingMaterialsConsumed && report.backwardTrace.packagingMaterialsConsumed.length > 0 && (
                                <Card className="p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-900 uppercase tracking-wider">
                                        <Store className="h-4 w-4 text-indigo-600" />
                                        4. Secondary Packaging BOM Consumed (Jars, Lids, Labels)
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {report.backwardTrace.packagingMaterialsConsumed.map((pkg, idx) => (
                                             <div key={idx} className="rounded-lg bg-gray-50 p-3 border border-gray-200 text-xs">
                                                <span className="font-semibold text-gray-900 block">{pkg.packagingMaterialName}</span>
                                                <span className="text-gray-500 font-mono mt-0.5 block">
                                                    Consumed: {pkg.quantityConsumed} {pkg.unit}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Forward Traceability Section */}
                    {report.forwardTrace && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                    →
                                </span>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Forward Recall Trace (Downstream Impact Assessment)
                                </h3>
                            </div>

                            {/* Bulk Batches Produced */}
                            {report.forwardTrace.bulkBatchesProduced && report.forwardTrace.bulkBatchesProduced.length > 0 && (
                                <Card className="p-5 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-amber-900 uppercase tracking-wider">
                                        <Cpu className="h-4 w-4 text-amber-600" />
                                        Bulk Cooking Batches Produced with this Material ({report.forwardTrace.bulkBatchesProduced.length})
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Batch Number</TableHead>
                                                <TableHead className="text-xs">Recipe Formula</TableHead>
                                                <TableHead className="text-xs">Quantity Produced</TableHead>
                                                <TableHead className="text-xs">Manufacturing Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.forwardTrace.bulkBatchesProduced.map((b, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-mono font-bold text-xs">
                                                        {b.batchNumber}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {b.recipeName}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-gray-900">
                                                        {b.actualQuantity} {b.yieldUnit}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {new Date(b.date).toLocaleDateString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}

                            {/* Packaging Runs Produced */}
                            {report.forwardTrace.packagingRuns && report.forwardTrace.packagingRuns.length > 0 && (
                                <Card className="p-5 border border-indigo-200 bg-indigo-50/20">
                                    <div className="flex items-center gap-2 mb-3 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                                        <Layers className="h-4 w-4 text-indigo-600" />
                                        Retail Packaging Runs at Risk / Subject to Recall ({report.forwardTrace.packagingRuns.length})
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Packaging Run #</TableHead>
                                                <TableHead className="text-xs">Product & Variant</TableHead>
                                                <TableHead className="text-xs">Pack Units Produced</TableHead>
                                                <TableHead className="text-xs">Packaging Date</TableHead>
                                                <TableHead className="text-xs">Expiry Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.forwardTrace.packagingRuns.map((p, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-mono font-bold text-xs text-indigo-700">
                                                        {p.runNumber}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {p.productTitle} — {p.variantTitle}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-emerald-700">
                                                        {p.unitsProduced} units
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-600">
                                                        {p.packagingDate ? new Date(p.packagingDate).toLocaleDateString() : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-rose-700 font-medium">
                                                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Print Batch Verification Labels Modal */}
            <PrintLabelModal
                isOpen={isPrintModalOpen}
                onClose={() => {
                    setIsPrintModalOpen(false);
                    setSelectedLotForPrint(null);
                }}
                lot={selectedLotForPrint}
                productTitle={report?.entitySummary?.nameOrTitle}
                variantTitle={report?.backwardTrace?.packagingRun?.variantTitle || "Retail Jar"}
            />

            {/* Confirm Emergency Lot Recall Modal */}
            <Modal
                isOpen={isRecallModalOpen}
                onClose={() => setIsRecallModalOpen(false)}
                title="Confirm Emergency Lot Recall"
                description="Triggering a recall immediately quarantines available lot inventory and unallocates active processing orders."
                maxWidth="lg"
            >
                <form onSubmit={handleRecallSubmit} className="space-y-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                        <FileWarning className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <strong>High Impact Operational Action:</strong>
                            <p className="mt-1">
                                Lot <strong>{report?.finishedGoodsLot?.lotNumber || report?.entitySummary?.codeOrNumber}</strong> will be marked <strong>RECALLED</strong>. Any active unfulfilled orders reserving this lot will be automatically released back, and inventory will be locked against future shipments.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Recall Reason <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            type="text"
                            placeholder="e.g., Allergen cross-contact, foreign material defect, seal failure..."
                            value={recallReason}
                            onChange={(e) => setRecallReason(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Recall Scope
                        </label>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <button
                                type="button"
                                onClick={() => setRecallScope("SPECIFIC_LOT")}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    recallScope === "SPECIFIC_LOT"
                                        ? "border-rose-500 bg-rose-50/50 text-rose-950 font-semibold shadow-xs"
                                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                                }`}
                            >
                                <div className="font-bold">Specific Lot Only</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                    Isolate only lot {report?.finishedGoodsLot?.lotNumber || report?.entitySummary?.codeOrNumber}
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecallScope("BATCH_WIDE")}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    recallScope === "BATCH_WIDE"
                                        ? "border-rose-500 bg-rose-50/50 text-rose-950 font-semibold shadow-xs"
                                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                                }`}
                            >
                                <div className="font-bold">Entire Production Batch</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                    Subject all packaging runs from this bulk cooking run to recall
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Additional Investigation Notes (Optional)
                        </label>
                        <Input
                            type="text"
                            placeholder="QA audit notes, lab report reference, or containment steps taken..."
                            value={recallNotes}
                            onChange={(e) => setRecallNotes(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRecallModalOpen(false)}
                            disabled={isRecalling}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="danger"
                            disabled={isRecalling}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
                        >
                            {isRecalling ? <Spinner size="sm" /> : <AlertOctagon className="h-4 w-4" />}
                            <span>Execute Emergency Recall</span>
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function LotTraceabilityPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading Traceability Hub...</div>}>
            <LotTraceabilityContent />
        </Suspense>
    );
}
