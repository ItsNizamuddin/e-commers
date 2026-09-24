"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGetManufacturingAlertsQuery } from "../../store/api";
import type {
    LotExpiryAlertItem,
    LowStockAlertItem,
    ExpiryAlertUrgency,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    Button,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@ecommers/ui";
import {
    ShieldAlert,
    Clock,
    AlertTriangle,
    Tag,
    RefreshCw,
    ArrowUpRight,
    CheckCircle2,
    Calendar,
    Boxes,
} from "lucide-react";

export function OperationalAlertsWidget() {
    const {
        data: alerts,
        isLoading,
        error,
        refetch,
    } = useGetManufacturingAlertsQuery();

    const [activeTab, setActiveTab] = useState<"expiry" | "low_stock">("expiry");

    if (isLoading) {
        return (
            <Card className="p-4 flex items-center justify-center min-h-[140px]">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <Spinner size="sm" />
                    <span>Querying real-time food safety & inventory shelf-life intelligence...</span>
                </div>
            </Card>
        );
    }

    if (error || !alerts) {
        return null;
    }

    const {
        summary = {
            expiredLotsCount: 0,
            upcomingExpiryCount: 0,
            lowStockRawMaterialsCount: 0,
            lowStockFinishedCount: 0,
            activeRecallsCount: 0,
        },
        expiredLots = [],
        expiringLots = [],
        lowStockRawMaterials = [],
        lowStockFinishedGoods = [],
        activeRecalls = [],
    } = alerts;

    const allExpiryAlerts: LotExpiryAlertItem[] = [...expiredLots, ...expiringLots];
    const allLowStockAlerts: LowStockAlertItem[] = [...lowStockRawMaterials, ...lowStockFinishedGoods];

    const hasUrgentAttention =
        summary.expiredLotsCount > 0 ||
        summary.activeRecallsCount > 0 ||
        expiringLots.some((it) => it.urgency === "CRITICAL");

    const totalAlertsCount = allExpiryAlerts.length + allLowStockAlerts.length;

    const getUrgencyBadge = (urgency: ExpiryAlertUrgency, days: number) => {
        switch (urgency) {
            case "EXPIRED":
                return (
                    <Badge variant="danger" size="sm">
                        EXPIRED ({Math.abs(days)}d ago)
                    </Badge>
                );
            case "CRITICAL":
                return (
                    <Badge variant="danger" size="sm">
                        CRITICAL ({days}d left)
                    </Badge>
                );
            case "WARNING":
                return (
                    <Badge variant="warning" size="sm">
                        WARNING ({days}d left)
                    </Badge>
                );
            case "ADVISORY":
                return (
                    <Badge variant="primary" size="sm">
                        ADVISORY ({days}d left)
                    </Badge>
                );
            default:
                return <Badge variant="neutral" size="sm">{days}d</Badge>;
        }
    };

    return (
        <Card className="p-4 border-2 border-slate-200/90 dark:border-neutral-800 shadow-sm flex flex-col gap-3.5">
            {/* Top Bar with Counters & Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${hasUrgentAttention ? "bg-rose-600 text-white animate-pulse" : "bg-blue-600 text-white"}`}>
                        <ShieldAlert size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                Food Safety & Shelf-Life Intelligence
                            </h2>
                            {hasUrgentAttention ? (
                                <Badge variant="danger" size="sm">
                                    ACTION REQUIRED
                                </Badge>
                            ) : totalAlertsCount > 0 ? (
                                <Badge variant="warning" size="sm">
                                    {totalAlertsCount} Attention Items
                                </Badge>
                            ) : (
                                <Badge variant="success" size="sm">
                                    All Lots Compliant
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Live database state for finished goods, raw lots, FEFO expiry windows, and sellable stock.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={12} />
                        <span>Refresh State</span>
                    </Button>
                </div>
            </div>

            {/* Critical Alert Banner if Food Safety at Risk */}
            {hasUrgentAttention && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start justify-between gap-3 text-rose-900 dark:text-rose-100 text-xs">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold">
                                High-Priority Food Safety Attention
                            </div>
                            <div className="mt-0.5 text-[11px] text-rose-800 dark:text-rose-200 flex flex-wrap gap-x-3 gap-y-0.5">
                                {summary.expiredLotsCount > 0 && (
                                    <span className="font-semibold text-rose-700 dark:text-rose-300">
                                        • {summary.expiredLotsCount} lot(s) past expiration date
                                    </span>
                                )}
                                {summary.activeRecallsCount > 0 && (
                                    <span className="font-semibold text-rose-700 dark:text-rose-300">
                                        • {summary.activeRecallsCount} active recall item(s) quarantined
                                    </span>
                                )}
                                {summary.upcomingExpiryCount > 0 && (
                                    <span>
                                        • {summary.upcomingExpiryCount} lot(s) approaching expiry
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/manufacturing/traceability"
                        className="shrink-0 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline hover:text-rose-900 dark:hover:text-rose-100 flex items-center gap-1"
                    >
                        <span>Trace Lots</span>
                        <ArrowUpRight size={12} />
                    </Link>
                </div>
            )}

            {/* Tab navigation: Expiry vs Sellable Low Stock */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-neutral-800 pb-1">
                <button
                    type="button"
                    onClick={() => setActiveTab("expiry")}
                    className={`px-3 py-1.5 rounded-t-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "expiry"
                            ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-400"
                            : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200"
                    }`}
                >
                    <Clock size={13} />
                    <span>Lot Expiry Countdown</span>
                    <Badge variant={allExpiryAlerts.length > 0 ? "warning" : "neutral"} size="sm">
                        {allExpiryAlerts.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("low_stock")}
                    className={`px-3 py-1.5 rounded-t-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "low_stock"
                            ? "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-400"
                            : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200"
                    }`}
                >
                    <Boxes size={13} />
                    <span>Sellable Stock Replenishment</span>
                    <Badge variant={allLowStockAlerts.length > 0 ? "danger" : "neutral"} size="sm">
                        {allLowStockAlerts.length}
                    </Badge>
                </button>
            </div>

            {/* Tab 1: Lot Shelf-Life Expiry Monitoring */}
            {activeTab === "expiry" && (
                <div>
                    {allExpiryAlerts.length === 0 ? (
                        <div className="py-6 text-center flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-neutral-400">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <div className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                                Zero Expiry Concerns
                            </div>
                            <p className="text-[11px] text-slate-400">
                                No raw materials or finished goods are within 30 days of shelf-life expiration.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lot Number & Type</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Available Qty</TableHead>
                                    <TableHead>Expiry Date</TableHead>
                                    <TableHead>Status / Window</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allExpiryAlerts.map((lot: LotExpiryAlertItem) => (
                                    <TableRow key={lot.lotId} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="font-mono text-xs font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-1.5">
                                                    <Tag size={12} className="text-indigo-500" />
                                                    <span>{lot.lotNumber}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 uppercase font-medium">
                                                    {lot.lotType === "FINISHED_GOODS" ? "Finished Goods" : "Raw Material"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs font-medium text-slate-800 dark:text-neutral-200">
                                                {lot.name}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="font-semibold text-xs text-slate-900 dark:text-neutral-100">
                                                {lot.availableQuantity} {lot.unit}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center gap-1 font-mono">
                                                <Calendar size={12} />
                                                <span>{new Date(lot.expiryDate).toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {getUrgencyBadge(lot.urgency, lot.daysRemaining)}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Link
                                                href={`/manufacturing/traceability?query=${encodeURIComponent(lot.lotNumber)}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                            >
                                                <span>Trace</span>
                                                <ArrowUpRight size={12} />
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

            {/* Tab 2: Sellable Stock Replenishment */}
            {activeTab === "low_stock" && (
                <div>
                    {allLowStockAlerts.length === 0 ? (
                        <div className="py-6 text-center flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-neutral-400">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <div className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                                All Sellable Inventory Healthy
                            </div>
                            <p className="text-[11px] text-slate-400">
                                All raw materials and finished goods meet or exceed their reorder thresholds after deducting quarantined, reserved, and expired lots.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type & Code</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Current Stock</TableHead>
                                    <TableHead>Threshold</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allLowStockAlerts.map((item: LowStockAlertItem) => (
                                    <TableRow key={`${item.type}-${item.id}`} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Badge
                                                    variant={item.type === "FINISHED_PRODUCT" ? "primary" : "neutral"}
                                                    size="sm"
                                                    className="w-fit"
                                                >
                                                    {item.type === "FINISHED_PRODUCT" ? "Finished" : "Raw"}
                                                </Badge>
                                                <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                                                    {item.codeOrSku}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs font-semibold text-slate-900 dark:text-neutral-100">
                                                {item.name}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="font-bold text-xs text-rose-600 dark:text-rose-400">
                                                {item.currentStock} {item.unit}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                                            {item.reorderThreshold} {item.unit}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {item.type === "RAW_MATERIAL" ? (
                                                <Link
                                                    href={`/manufacturing/purchases?rawMaterialId=${item.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    <span>Intake</span>
                                                    <ArrowUpRight size={12} />
                                                </Link>
                                            ) : (
                                                <Link
                                                    href="/manufacturing/production"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                                >
                                                    <span>Produce</span>
                                                    <ArrowUpRight size={12} />
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}
        </Card>
    );
}
