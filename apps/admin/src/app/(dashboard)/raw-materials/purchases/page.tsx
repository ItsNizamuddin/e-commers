"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useGetRawMaterialLotsQuery } from "../../../../store/api";
import type {
    RawMaterialLot,
    RawMaterialUnit,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Spinner,
    Pagination,
} from "@ecommers/ui";
import {
    Truck,
    Plus,
    RefreshCw,
    Building2,
    Tractor,
    ArrowLeft,
} from "lucide-react";

const UNITS: Array<{ label: string; value: RawMaterialUnit }> = [
    { label: "Kilograms (kg)", value: "kg" },
    { label: "Grams (g)", value: "g" },
    { label: "Liters (l)", value: "l" },
    { label: "Milliliters (ml)", value: "ml" },
    { label: "Pieces (pcs)", value: "pcs" },
    { label: "Packs (pack)", value: "pack" },
];

export default function RawMaterialPurchasesPage() {
    const {
        data: lots = [],
        isLoading: loading,
        isFetching: refreshing,
        refetch,
    } = useGetRawMaterialLotsQuery();
    const [sourceFilter, setSourceFilter] = useState<"ALL" | "EXTERNAL_VENDOR" | "OWN_FARM">("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const filteredLots = useMemo(() => {
        if (sourceFilter === "ALL") return lots;
        return lots.filter((l) => l.sourceType === sourceFilter);
    }, [lots, sourceFilter]);

    const totalItems = filteredLots.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedLots = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredLots.slice(start, start + pageSize);
    }, [filteredLots, page, pageSize]);

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
                                Raw Material Intakes & Purchases
                            </h1>
                            <Badge variant="primary" size="sm">Procurement</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Log supplier purchases and in-house farm harvests with lot numbers and expiry dates
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
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
                    <Link href="/raw-materials/purchases/new">
                        <Button
                            variant="primary"
                            size="sm"
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Plus size={14} />
                            <span>Record Inward Intake</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Source Filter Tabs & Page Size */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setSourceFilter("ALL");
                            setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            sourceFilter === "ALL"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-neutral-900"
                                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                        }`}
                    >
                        All Intakes ({lots.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSourceFilter("EXTERNAL_VENDOR");
                            setPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            sourceFilter === "EXTERNAL_VENDOR"
                                ? "bg-blue-600 text-white"
                                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                        }`}
                    >
                        <Building2 size={13} />
                        <span>Vendor Purchases ({lots.filter((l) => l.sourceType === "EXTERNAL_VENDOR").length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSourceFilter("OWN_FARM");
                            setPage(1);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            sourceFilter === "OWN_FARM"
                                ? "bg-emerald-600 text-white"
                                : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                        }`}
                    >
                        <Tractor size={13} />
                        <span>Own Farm Harvests ({lots.filter((l) => l.sourceType === "OWN_FARM").length})</span>
                    </button>
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

            {/* Intake History Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2">Loading intake records...</p>
                    </div>
                ) : filteredLots.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <Truck size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Inward Intakes Found</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Record your first purchase intake from an external vendor or internal farm harvest.
                        </p>
                        <Link href="/raw-materials/purchases/new">
                            <Button
                                variant="primary"
                                size="sm"
                                className="mt-4 gap-1.5 text-xs font-semibold"
                            >
                                <Plus size={13} />
                                <span>Record Intake</span>
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Date & Lot Number</th>
                                        <th className="py-3 px-3">Raw Material</th>
                                        <th className="py-3 px-3">Source & Origin</th>
                                        <th className="py-3 px-3 text-right">Intake Qty</th>
                                        <th className="py-3 px-3 text-right">Remaining</th>
                                        <th className="py-3 px-3 text-right">Unit Rate</th>
                                        <th className="py-3 px-3">Best Before / Expiry</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                    {paginatedLots.map((lot) => {
                                    const isFarm = lot.sourceType === "OWN_FARM";
                                    const isExpired = new Date(lot.expiryDate) < new Date();

                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {lot.lotNumber}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {new Date(lot.receivedDate).toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                                {(lot as any).rawMaterialId?.name || "Raw Material"}
                                            </td>
                                            <td className="py-3 px-3">
                                                {isFarm ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                                        <Tractor size={13} className="shrink-0" />
                                                        <span className="font-medium truncate max-w-[150px]">
                                                            {lot.farmDetails?.farmName || "Own Farm"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                        <Building2 size={13} className="shrink-0 text-slate-400" />
                                                        <span className="font-medium truncate max-w-[150px]">
                                                            {lot.supplier?.name || "Vendor"}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {lot.initialQuantity} {lot.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-neutral-400">
                                                {lot.availableQuantity} {lot.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                ₹{lot.costPerUnit.toFixed(2)} / {lot.unit}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`font-mono text-[11px] ${isExpired ? "text-rose-600 font-bold" : "text-slate-600 dark:text-neutral-300"}`}>
                                                    {new Date(lot.expiryDate).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                    {isExpired && " (EXPIRED)"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge
                                                    variant={lot.isDepleted ? "neutral" : isExpired ? "danger" : "success"}
                                                    size="sm"
                                                >
                                                    {lot.isDepleted ? "Depleted" : isExpired ? "Expired" : "Active"}
                                                </Badge>
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

