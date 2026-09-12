"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../../../lib/api";
import type { RawMaterialStockMovement, RawMaterial } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Spinner,
    Select,
    toast,
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

    const [movements, setMovements] = useState<RawMaterialStockMovement[]>([]);
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState(initialRawMaterialId);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        try {
            const [ledgerData, matsData] = await Promise.all([
                api.manufacturing.listLedger({
                    rawMaterialId: selectedMaterialId || undefined,
                    limit: 150,
                }),
                api.manufacturing.listRawMaterials(),
            ]);
            setMovements(ledgerData || []);
            setMaterials(matsData || []);
        } catch (err: unknown) {
            console.error("Failed to load ledger:", err);
            toast.error("Failed to load stock movements.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedMaterialId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Filter Material:</span>
                    <div className="w-64">
                        <Select
                            value={selectedMaterialId}
                            onChange={(e) => setSelectedMaterialId(e.target.value)}
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

                <span className="text-xs text-slate-400">Showing last {movements.length} ledger events</span>
            </div>

            {/* Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs">
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800 text-slate-500 font-semibold">
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
                                {movements.map((mov) => {
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
