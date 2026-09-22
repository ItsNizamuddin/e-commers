"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useGetLotTraceabilityQuery } from "../../../../store/api";

export default function LotTraceabilityPage() {
    const [searchInput, setSearchInput] = useState("");
    const [activeQuery, setActiveQuery] = useState("");

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchInput.trim();
        if (!trimmed) {
            toast.error("Please enter a lot number, batch number, or packaging run number.");
            return;
        }
        setActiveQuery(trimmed);
    };

    const setExample = (val: string) => {
        setSearchInput(val);
        setActiveQuery(val);
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
                        Perform instantaneous forward and backward genealogy traces. Trace backward from a customer-facing retail pack to farm harvest lots, or trace forward from a contaminated ingredient lot to every downstream batch, packaging run, and warehouse.
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
                    <Card className="p-6 border-l-4 border-l-primary bg-gradient-to-r from-gray-50 to-white">
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
                                <h2 className="mt-2 text-xl font-bold text-gray-900 font-mono">
                                    {report.entitySummary.codeOrNumber}
                                </h2>
                                <p className="text-sm font-medium text-gray-600">
                                    {report.entitySummary.nameOrTitle}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs sm:text-right">
                                <div>
                                    <span className="text-gray-500 block">Production / Intake Date</span>
                                    <span className="font-semibold text-gray-900">
                                        {report.entitySummary.date ? new Date(report.entitySummary.date).toLocaleDateString() : "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Expiry Date</span>
                                    <span className="font-semibold text-emerald-700">
                                        {report.entitySummary.expiryDate
                                            ? new Date(report.entitySummary.expiryDate).toLocaleDateString()
                                            : "No Expiry"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

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
        </div>
    );
}
