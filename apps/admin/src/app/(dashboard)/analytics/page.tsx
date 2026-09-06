"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type { SalesAnalyticsResponse } from "@ecommers/types";
import {
    Card,
    Badge,
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
    DollarSign,
    ShoppingBag,
    Package,
    TrendingUp,
    RefreshCw,
    Calendar,
} from "lucide-react";

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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                            }}
                        >
                            <BarChart3 size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Sales & Revenue Analytics
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Aggregated order metrics, units sold, and average order value (AOV) over time.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
                        {(["day", "week", "month"] as const).map((int) => (
                            <button
                                key={int}
                                type="button"
                                onClick={() => setInterval(int)}
                                style={{
                                    padding: "0.3125rem 0.75rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: interval === int ? "#ffffff" : "transparent",
                                    color: interval === int ? "#0f172a" : "#64748b",
                                    boxShadow: interval === int ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                                    cursor: "pointer",
                                    textTransform: "capitalize",
                                }}
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
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                    <Spinner size="md" />
                    <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Computing sales aggregations...</p>
                </div>
            ) : error ? (
                <ErrorState title="Unable to load analytics" message={error} onRetry={() => fetchAnalytics()} />
            ) : analytics ? (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                        <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Net Revenue
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.375rem" }}>
                                ${(analytics.summary.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.25rem" }}>
                                Currency: USD
                            </div>
                        </Card>

                        <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Total Orders
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.375rem" }}>
                                {(analytics.summary.totalOrders || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                                Completed / Confirmed
                            </div>
                        </Card>

                        <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Units Sold
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.375rem" }}>
                                {(analytics.summary.totalUnitsSold || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                                Physical items
                            </div>
                        </Card>

                        <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                Average Order Value
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.375rem" }}>
                                ${(analytics.summary.averageOrderValue || 0).toFixed(2)}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#2563eb", marginTop: "0.25rem" }}>
                                Per non-cancelled order
                            </div>
                        </Card>
                    </div>

                    {/* Time-Series Table */}
                    <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                        <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
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
                                    <TableRow>
                                        <TableCell colSpan={4} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                            No sales data available for this time range.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    analytics.series.map((pt, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell style={{ fontWeight: 600, color: "#0f172a" }}>
                                                {pt.date}
                                            </TableCell>
                                            <TableCell>{pt.orderCount}</TableCell>
                                            <TableCell>{pt.unitsSold}</TableCell>
                                            <TableCell style={{ fontWeight: 700, color: "#2563eb" }}>
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
    );
}
