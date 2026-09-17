"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    useGetRawMaterialLedgerQuery,
    useGetRawMaterialsQuery,
} from "../../../../store/api";
import type { RawMaterialStockMovement, RawMaterial } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Spinner,
    Select,
    Pagination,
} from "@ecommers/ui";
import {
    Layers,
    ArrowLeft,
    RefreshCw,
    PlusCircle,
    MinusCircle,
    RotateCcw,
    AlertOctagon,
    Sliders,
    Search,
} from "lucide-react";

function RawMaterialLedgerContent() {
    const searchParams = useSearchParams();
    const initialRawMaterialId = searchParams.get("rawMaterialId") || "";

    const [selectedMaterialId, setSelectedMaterialId] = useState(initialRawMaterialId);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const {
        data: movements = [],
        isLoading: ledgerLoading,
        isFetching: ledgerFetching,
        refetch: refetchLedger,
    } = useGetRawMaterialLedgerQuery({
        rawMaterialId: selectedMaterialId || undefined,
        limit: 250,
    });

    const {
        data: materials = [],
        isLoading: matsLoading,
        refetch: refetchMats,
    } = useGetRawMaterialsQuery();

    const loading = ledgerLoading || matsLoading;
    const refreshing = ledgerFetching;

    const handleRefresh = () => {
        refetchLedger();
        refetchMats();
    };

    const handleMaterialChange = (newId: string) => {
        setSelectedMaterialId(newId);
        setPage(1);
    };

    const totalItems = movements.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    useEffect(() => {
        if (page > totalPages) {
            setPage(1);
        }
    }, [totalPages, page]);

    const paginatedMovements = useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        return movements.slice(startIndex, startIndex + pageSize);
    }, [movements, page, pageSize]);

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "PURCHASE_INTAKE":
                return <Badge variant="success" size="sm">PURCHASE INTAKE</Badge>;
            case "MANUFACTURING_CONSUMPTION":
                return <Badge variant="primary" size="sm">MFG CONSUMPTION</Badge>;
            case "MANUFACTURING_REVERSAL":
                return <Badge variant="neutral" size="sm">MFG REVERSAL</Badge>;
            case "WASTAGE_SCRAP":
                return <Badge variant="danger" size="sm">WASTAGE / SCRAP</Badge>;
            case "MANUAL_ADJUSTMENT":
                return <Badge variant="warning" size="sm">AUDIT ADJUSTMENT</Badge>;
            case "RETURN_TO_SUPPLIER":
                return <Badge variant="neutral" size="sm">SUPPLIER RETURN</Badge>;
            default:
                return <Badge variant="neutral" size="sm">{type}</Badge>;
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/raw-materials"
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Raw Material Stock Ledger
                            </h1>
                            <Badge variant="neutral" size="sm">Immutable Ledger</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Immutable transaction history for all raw material purchases, kitchen consumption, and reversals
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Filter Material:</span>
                    <div className="w-64">
                        <Select
                            value={selectedMaterialId}
                            onChange={(e) => handleMaterialChange(e.target.value)}
                            options={[
                                { label: "All Materials", value: "" },
                                ...materials.map((m) => ({
                                    label: `${m.name} (${m.code})`,
                                    value: m.id,
                                })),
                            ]}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
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
                    <span>entries per page</span>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2">Loading stock ledger...</p>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <Layers size={28} className="text-slate-400 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Ledger Movements Found</h3>
                        <p className="text-xs text-slate-400 mt-1">Transactions will appear as materials are purchased or cooked.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-3">Raw Material</th>
                                        <th className="py-3 px-3">Movement Type</th>
                                        <th className="py-3 px-3 text-right">Quantity Delta</th>
                                        <th className="py-3 px-3 text-right">Stock Transition</th>
                                        <th className="py-3 px-3">Reference ID</th>
                                        <th className="py-3 px-4">Reason / Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                    {paginatedMovements.map((mov) => {
                                        const isPositive = mov.quantityDelta > 0;

                                        return (
                                            <tr key={mov.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="py-3 px-4 font-mono text-slate-500">
                                                    {new Date(mov.createdAt).toLocaleString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                                    {(mov as any).rawMaterialId?.name || "Raw Material"}
                                                </td>
                                                <td className="py-3 px-3">
                                                    {getTypeBadge(mov.type)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold">
                                                    <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                                                        {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta} {mov.unit}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-slate-500">
                                                    <span>{mov.previousStock}</span>
                                                    <span className="mx-1 text-slate-300">→</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{mov.newStock} {mov.unit}</span>
                                                </td>
                                                <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                                                    {mov.referenceId}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-neutral-300 truncate max-w-[250px]">
                                                    {mov.reason || "—"}
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
        </div>
    );
}

export default function RawMaterialLedgerPage() {
    return (
        <Suspense fallback={<div className="py-20 flex justify-center"><Spinner size="lg" /></div>}>
            <RawMaterialLedgerContent />
        </Suspense>
    );
}
