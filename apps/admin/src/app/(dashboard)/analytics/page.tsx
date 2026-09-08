"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type { SalesAnalyticsResponse } from "@ecommers/types";
import {
    Card,
    Spinner,
    ErrorState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Button,
} from "@ecommers/ui";
import {
    BarChart3,
    RefreshCw,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<SalesAnalyticsResponse | null>(null);
    const [interval, setInterval] = useState<"day" | "week" | "month">("day");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await api.admin.getSalesAnalytics({ interval, currency: "USD" });
            setAnalytics(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to retrieve sales analytics.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [interval]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN", "SALES"]}>
            <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <BarChart3 size={15} />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Sales & Revenue Analytics
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Aggregated order metrics, units sold, and average order value (AOV) over time.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-neutral-800 p-0.5 rounded-lg">
                        {(["day", "week", "month"] as const).map((int) => (
                            <button
                                key={int}
                                type="button"
                                onClick={() => setInterval(int)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer capitalize ${
                                    interval === int
                                        ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                {int}
                            </button>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAnalytics(true)}
                        isLoading={refreshing}
                        className="gap-1.5"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Spinner size="md" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Computing sales aggregations...</p>
                </div>
            ) : error ? (
                <ErrorState title="Unable to load analytics" message={error} onRetry={() => fetchAnalytics()} />
            ) : analytics ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="p-3.5">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Net Revenue
                            </div>
                            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                ${(analytics.summary.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                Currency: USD
                            </div>
                        </Card>

                        <Card className="p-3.5">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Orders
                            </div>
                            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                {(analytics.summary.totalOrders || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Completed / Confirmed
                            </div>
                        </Card>

                        <Card className="p-3.5">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Units Sold
                            </div>
                            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                {(analytics.summary.totalUnitsSold || 0).toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Physical items
                            </div>
                        </Card>

                        <Card className="p-3.5">
                            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Average Order Value
                            </div>
                            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                ${(analytics.summary.averageOrderValue || 0).toFixed(2)}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                                Per order
                            </div>
                        </Card>
                    </div>

                    {/* Time-Series Table */}
                    <Card className="p-3.5 sm:p-4">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mb-3">
                            Time-Series Breakdown ({interval})
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Interval Period</TableHead>
                                    <TableHead>Orders Count</TableHead>
                                    <TableHead>Units Sold</TableHead>
                                    <TableHead>Net Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics.series.length === 0 ? (
                                    <TableRow noHover>
                                        <TableCell colSpan={4} className="text-center text-slate-400 dark:text-slate-500 py-10">
                                            No sales data available for this time range.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    analytics.series.map((pt, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                                                {pt.date}
                                            </TableCell>
                                            <TableCell>{pt.orderCount}</TableCell>
                                            <TableCell>{pt.unitsSold}</TableCell>
                                            <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                                ${pt.netRevenue.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            ) : null}
            </div>
        </RequireRole>
    );
}
