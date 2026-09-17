"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    useGetRawMaterialLotsQuery,
    useGetRawMaterialsQuery,
} from "../../../../store/api";
import type { RawMaterialLot, RawMaterial } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Spinner,
    Select,
    SearchableSelect,
    Pagination,
} from "@ecommers/ui";
import {
    CalendarCheck,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    Clock,
    Tractor,
    Building2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";

function RawMaterialLotsContent() {
    const searchParams = useSearchParams();
    const initialRawMaterialId = searchParams.get("rawMaterialId") || "";

    const [selectedMaterialId, setSelectedMaterialId] = useState(initialRawMaterialId);
    const [hideDepleted, setHideDepleted] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const {
        data: lots = [],
        isLoading: lotsLoading,
        isFetching: lotsFetching,
        refetch: refetchLots,
    } = useGetRawMaterialLotsQuery({
        rawMaterialId: selectedMaterialId || undefined,
        isDepleted: hideDepleted ? false : undefined,
    });

    const totalItems = lots.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedLots = useMemo(() => {
        const start = (page - 1) * pageSize;
        return lots.slice(start, start + pageSize);
    }, [lots, page, pageSize]);

    const {
        data: materials = [],
        isLoading: matsLoading,
        refetch: refetchMats,
    } = useGetRawMaterialsQuery();

    const loading = lotsLoading || matsLoading;
    const refreshing = lotsFetching;

    const handleRefresh = () => {
        refetchLots();
        refetchMats();
    };

    const metrics = useMemo(() => {
        const now = new Date().getTime();
        let expiredCount = 0;
        let expiringSoonCount = 0; // within 15 days
        let activeCount = 0;

        for (const lot of lots) {
            if (lot.isDepleted) continue;
            activeCount++;
            const expTime = new Date(lot.expiryDate).getTime();
            const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
                expiredCount++;
            } else if (diffDays <= 15) {
                expiringSoonCount++;
            }
        }

        return { expiredCount, expiringSoonCount, activeCount, total: lots.length };
    }, [lots]);

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
                                Active Lots & FEFO Expiry Dashboard
                            </h1>
                            <Badge variant="primary" size="sm">FEFO Priority</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Food safety lot tracking: First Expired, First Out (FEFO) consumption order
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
                    <Link href="/raw-materials/purchases">
                        <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold">
                            <span>Record New Intake</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800">
                    <span className="text-xs font-medium text-slate-500">Active Non-Depleted Lots</span>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{metrics.activeCount}</p>
                    <p className="text-[11px] text-slate-400">Available for production</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800">
                    <span className="text-xs font-medium text-slate-500">Safe Stock</span>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {metrics.activeCount - metrics.expiringSoonCount - metrics.expiredCount}
                    </p>
                    <p className="text-[11px] text-slate-400">&gt; 15 days shelf life remaining</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800">
                    <span className="text-xs font-medium text-slate-500">Expiring Soon (FEFO Alert)</span>
                    <p className={`text-2xl font-bold mt-1 ${metrics.expiringSoonCount > 0 ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
                        {metrics.expiringSoonCount}
                    </p>
                    <p className="text-[11px] text-slate-400">&le; 15 days remaining (use first)</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800">
                    <span className="text-xs font-medium text-slate-500">Expired Lots</span>
                    <p className={`text-2xl font-bold mt-1 ${metrics.expiredCount > 0 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>
                        {metrics.expiredCount}
                    </p>
                    <p className="text-[11px] text-slate-400">Blocked from kitchen production</p>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Filter Material:</span>
                    <div className="w-64">
                        <SearchableSelect
                            value={selectedMaterialId}
                            onChange={setSelectedMaterialId}
                            options={[
                                { label: "All Raw Materials", value: "" },
                                ...materials.map((m) => ({
                                    label: m.name,
                                    subText: m.code,
                                    value: m.id,
                                })),
                            ]}
                            placeholder="All Raw Materials"
                            searchPlaceholder="Search material..."
                            size="sm"
                            pageSize={15}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-neutral-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hideDepleted}
                            onChange={(e) => {
                                setHideDepleted(e.target.checked);
                                setPage(1);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Hide Depleted (0 balance)</span>
                    </label>

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
                        <span>entries</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2">Sorting lots by FEFO order...</p>
                    </div>
                ) : lots.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <CalendarCheck size={28} className="text-slate-400 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Lots Found</h3>
                        <p className="text-xs text-slate-400 mt-1">No active lots match the selected filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-slate-500 font-semibold">
                                        <th className="py-3 px-4">FEFO Order & Lot #</th>
                                        <th className="py-3 px-3">Raw Material</th>
                                        <th className="py-3 px-3">Source Origin</th>
                                        <th className="py-3 px-3 text-right">Available Qty</th>
                                        <th className="py-3 px-3 text-right">Cost Rate</th>
                                        <th className="py-3 px-3">Expiration Date</th>
                                        <th className="py-3 px-3 text-center">Days Remaining</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                    {paginatedLots.map((lot, idx) => {
                                    const now = new Date().getTime();
                                    const expTime = new Date(lot.expiryDate).getTime();
                                    const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
                                    const isExpired = diffDays <= 0;
                                    const isSoon = diffDays > 0 && diffDays <= 15;

                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                        {lot.lotNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                                {(lot as any).rawMaterialId?.name || "Raw Material"}
                                            </td>
                                            <td className="py-3 px-3">
                                                {lot.sourceType === "OWN_FARM" ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                                        <Tractor size={12} />
                                                        <span className="truncate max-w-[130px]">{lot.farmDetails?.farmName || "Own Farm"}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-neutral-300">
                                                        <Building2 size={12} />
                                                        <span className="truncate max-w-[130px]">{lot.supplier?.name || "Vendor"}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                {lot.availableQuantity} / {lot.initialQuantity} {lot.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">
                                                ₹{lot.costPerUnit.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-3 font-mono">
                                                {new Date(lot.expiryDate).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {lot.isDepleted ? (
                                                    <span className="text-slate-400">—</span>
                                                ) : isExpired ? (
                                                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold font-mono">
                                                        <XCircle size={12} /> Expired ({Math.abs(diffDays)}d ago)
                                                    </span>
                                                ) : isSoon ? (
                                                    <span className="inline-flex items-center gap-1 text-amber-600 font-bold font-mono">
                                                        <AlertTriangle size={12} /> {diffDays} days left
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-mono">
                                                        <CheckCircle2 size={12} /> {diffDays} days left
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge
                                                    variant={lot.isDepleted ? "neutral" : isExpired ? "danger" : isSoon ? "warning" : "success"}
                                                    size="sm"
                                                >
                                                    {lot.isDepleted ? "Depleted" : isExpired ? "Expired" : isSoon ? "Expiring Soon" : "Good"}
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

export default function RawMaterialLotsPage() {
    return (
        <Suspense fallback={<div className="py-20 flex justify-center"><Spinner size="lg" /></div>}>
            <RawMaterialLotsContent />
        </Suspense>
    );
}
