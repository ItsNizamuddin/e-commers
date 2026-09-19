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
    toast,
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
    LayoutList,
    LayoutGrid,
    Copy,
    Check,
} from "lucide-react";

function RawMaterialLotsContent() {
    const searchParams = useSearchParams();
    const initialRawMaterialId = searchParams.get("rawMaterialId") || "";

    const [selectedMaterialId, setSelectedMaterialId] = useState(initialRawMaterialId);
    const [hideDepleted, setHideDepleted] = useState(false);
    const [viewMode, setViewMode] = useState<"table" | "grid">("table");
    const [copiedLotNumber, setCopiedLotNumber] = useState<string | null>(null);
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

    const handleCopyLot = (e: React.MouseEvent, lotNumber: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(lotNumber);
        setCopiedLotNumber(lotNumber);
        toast.success("Lot ID copied to clipboard");
        setTimeout(() => setCopiedLotNumber(null), 1500);
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

            {/* Filter Bar with View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Filter Material:</span>
                    <div className="w-64">
                        <SearchableSelect
                            value={selectedMaterialId}
                            onChange={(val) => {
                                setSelectedMaterialId(val);
                                setPage(1);
                            }}
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

                <div className="flex items-center gap-3.5 flex-wrap">
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
                        <span>Hide Depleted</span>
                    </label>

                    {/* View Switcher: Table vs Cards */}
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800/70 p-0.5 rounded-lg border border-slate-200/80 dark:border-neutral-700/60">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === "table"
                                    ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200"
                            }`}
                            title="Consolidated Table View"
                        >
                            <LayoutList size={13} />
                            <span>Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200"
                            }`}
                            title="Visual Card Grid View"
                        >
                            <LayoutGrid size={13} />
                            <span>Cards</span>
                        </button>
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
                        <span>entries</span>
                    </div>
                </div>
            </div>

            {/* Content Display: Table or Grid */}
            {loading ? (
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-20 flex flex-col items-center justify-center">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-400 mt-2 font-medium">Sorting lots by FEFO order...</p>
                </Card>
            ) : lots.length === 0 ? (
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-16 text-center">
                    <CalendarCheck size={32} className="text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Lots Found</h3>
                    <p className="text-xs text-slate-400 mt-1">No active lots match the selected filters.</p>
                </Card>
            ) : viewMode === "grid" ? (
                /* Card Grid View */
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedLots.map((lot, idx) => {
                            const now = new Date().getTime();
                            const expTime = new Date(lot.expiryDate).getTime();
                            const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
                            const isExpired = diffDays <= 0;
                            const isSoon = diffDays > 0 && diffDays <= 15;
                            const pctAvailable = lot.initialQuantity > 0
                                ? Math.min(100, Math.max(0, (lot.availableQuantity / lot.initialQuantity) * 100))
                                : 0;
                            const globalIndex = (page - 1) * pageSize + idx + 1;

                            return (
                                <Card
                                    key={lot.id}
                                    className={`bg-white dark:bg-[#111111] border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md ${
                                        lot.isDepleted
                                            ? "border-slate-200 dark:border-neutral-800 opacity-70"
                                            : isExpired
                                            ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/10"
                                            : isSoon
                                            ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/10"
                                            : "border-slate-200/80 dark:border-neutral-800"
                                    }`}
                                >
                                    {/* Top Row: FEFO Rank & Status Badge */}
                                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-neutral-800/80">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight ${
                                                globalIndex === 1
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                            }`}>
                                                FEFO #{globalIndex}
                                            </span>
                                            {globalIndex === 1 && !lot.isDepleted && !isExpired && (
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                    Consume First
                                                </span>
                                            )}
                                        </div>
                                        <Badge
                                            variant={lot.isDepleted ? "neutral" : isExpired ? "danger" : isSoon ? "warning" : "success"}
                                            size="sm"
                                        >
                                            {lot.isDepleted ? "Depleted" : isExpired ? "Expired" : isSoon ? "Expiring Soon" : "Good"}
                                        </Badge>
                                    </div>

                                    {/* Material Name & Lot Number */}
                                    <div className="mt-3">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                            {(lot as any).rawMaterialId?.name || "Raw Material"}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[210px]" title={lot.lotNumber}>
                                                {lot.lotNumber}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => handleCopyLot(e, lot.lotNumber)}
                                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded"
                                                title="Copy Lot Number"
                                            >
                                                {copiedLotNumber === lot.lotNumber ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Origin Details */}
                                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-neutral-400">
                                        {lot.sourceType === "OWN_FARM" ? (
                                            <>
                                                <Tractor size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span className="truncate">{lot.farmDetails?.farmName || "Own Farm"}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Building2 size={13} className="text-slate-500 shrink-0" />
                                                <span className="truncate">{lot.supplier?.name || "Vendor Supplier"}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Stock Progress & Value */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80 space-y-2">
                                        <div className="flex items-baseline justify-between text-xs">
                                            <span className="text-slate-500 dark:text-neutral-400 font-medium">Available Stock:</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                {lot.availableQuantity} / {lot.initialQuantity} {lot.unit}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    lot.isDepleted ? "bg-slate-300 dark:bg-neutral-700" : pctAvailable < 20 ? "bg-amber-500" : "bg-blue-600"
                                                }`}
                                                style={{ width: `${pctAvailable}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                                            <span>Cost Rate:</span>
                                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                ₹{lot.costPerUnit.toFixed(2)} / {lot.unit}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expiry Banner */}
                                    <div className={`mt-3.5 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs ${
                                        lot.isDepleted
                                            ? "bg-slate-100 dark:bg-neutral-800/50 text-slate-500"
                                            : isExpired
                                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                                            : isSoon
                                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                            : "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                                    }`}>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={13} className="shrink-0" />
                                            <span className="font-mono font-semibold">
                                                {new Date(lot.expiryDate).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        <span className="font-bold text-[11px]">
                                            {lot.isDepleted ? "Depleted" : isExpired ? `Expired (${Math.abs(diffDays)}d ago)` : `${diffDays} days left`}
                                        </span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {totalItems > 0 && (
                        <Card className="p-3 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </Card>
                    )}
                </div>
            ) : (
                /* Consolidated Table View */
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                <tr className="text-slate-500 font-semibold">
                                    <th className="py-3 px-4">FEFO Order & Raw Material</th>
                                    <th className="py-3 px-3">Source Origin</th>
                                    <th className="py-3 px-3 text-right">Stock & Valuation</th>
                                    <th className="py-3 px-4">Shelf Life & Expiry Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                {paginatedLots.map((lot, idx) => {
                                    const now = new Date().getTime();
                                    const expTime = new Date(lot.expiryDate).getTime();
                                    const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
                                    const isExpired = diffDays <= 0;
                                    const isSoon = diffDays > 0 && diffDays <= 15;
                                    const pctAvailable = lot.initialQuantity > 0
                                        ? Math.min(100, Math.max(0, (lot.availableQuantity / lot.initialQuantity) * 100))
                                        : 0;
                                    const globalIndex = (page - 1) * pageSize + idx + 1;

                                    return (
                                        <tr key={lot.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                            {/* Column 1: FEFO Order + Material Name + Lot Code */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                                                        globalIndex === 1 && !lot.isDepleted && !isExpired
                                                            ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-100 dark:ring-blue-900"
                                                            : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400"
                                                    }`}>
                                                        {globalIndex}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                                            {(lot as any).rawMaterialId?.name || "Raw Material"}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[220px]" title={lot.lotNumber}>
                                                                {lot.lotNumber}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleCopyLot(e, lot.lotNumber)}
                                                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-0.5 rounded"
                                                                title="Copy Lot Number"
                                                            >
                                                                {copiedLotNumber === lot.lotNumber ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Source Origin */}
                                            <td className="py-3 px-3">
                                                {lot.sourceType === "OWN_FARM" ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                                                        <Tractor size={14} className="shrink-0" />
                                                        <span className="truncate max-w-[160px]">{lot.farmDetails?.farmName || "Own Farm"}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-neutral-300 font-medium">
                                                        <Building2 size={14} className="shrink-0 text-slate-400" />
                                                        <span className="truncate max-w-[160px]">{lot.supplier?.name || "Vendor Supplier"}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Column 3: Stock & Valuation */}
                                            <td className="py-3 px-3 text-right">
                                                <div className="inline-block text-right">
                                                    <div className="flex items-baseline justify-end gap-1">
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                                                            {lot.availableQuantity}
                                                        </span>
                                                        <span className="text-slate-400 text-[11px]">
                                                            / {lot.initialQuantity} {lot.unit}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2 mt-1">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    lot.isDepleted ? "bg-slate-300 dark:bg-neutral-700" : pctAvailable < 20 ? "bg-amber-500" : "bg-blue-600"
                                                                }`}
                                                                style={{ width: `${pctAvailable}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                                            ₹{lot.costPerUnit.toFixed(2)}/{lot.unit}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 4: Expiry, Shelf Life & Status */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-neutral-200 block">
                                                            {new Date(lot.expiryDate).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                            })}
                                                        </span>
                                                        <div className="text-[11px] mt-0.5">
                                                            {lot.isDepleted ? (
                                                                <span className="text-slate-400">Depleted (0 balance)</span>
                                                            ) : isExpired ? (
                                                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                                                    <XCircle size={12} /> Expired ({Math.abs(diffDays)}d ago)
                                                                </span>
                                                            ) : isSoon ? (
                                                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                                                    <AlertTriangle size={12} /> {diffDays} days left
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    <CheckCircle2 size={12} /> {diffDays} days shelf life
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={lot.isDepleted ? "neutral" : isExpired ? "danger" : isSoon ? "warning" : "success"}
                                                        size="sm"
                                                    >
                                                        {lot.isDepleted ? "Depleted" : isExpired ? "Expired" : isSoon ? "Expiring Soon" : "Good"}
                                                    </Badge>
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
                </Card>
            )}
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
