"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { AdminDashboardMetrics, AdminLowStockItem, AdminRecentOrderItem } from "@ecommers/types";
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
} from "@ecommers/ui";
import {
    DollarSign,
    ShoppingBag,
    Users,
    AlertTriangle,
    ArrowUpRight,
    PackageCheck,
    Truck,
    Clock,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function DashboardOverviewPage() {
    const [data, setData] = useState<AdminDashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const metrics = await api.admin.getDashboard();
            setData(metrics);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load dashboard metrics.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spinner size="lg" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading backoffice intelligence...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="py-12">
                <ErrorState
                    title="Unable to load dashboard"
                    message={error || "Could not retrieve executive metrics from the API server."}
                    onRetry={fetchDashboard}
                />
            </div>
        );
    }

    const { financials, orders, customers, inventory, recentOrders } = data;
    const lowStockAlerts = inventory.lowStockAlerts || [];

    const getOrderStatusBadgeVariant = (
        status: string
    ): "success" | "danger" | "primary" | "warning" | "neutral" => {
        switch (status) {
            case "DELIVERED":
                return "success";
            case "CANCELLED":
                return "danger";
            case "SHIPPED":
                return "primary";
            case "PENDING":
                return "warning";
            default:
                return "neutral";
        }
    };

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN", "SALES"]}>
            <div className="flex flex-col gap-4">
            {/* Header */}
            <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    Executive Overview
                </h1>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    Real-time operational health, revenue metrics, and inventory alerts
                </p>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Revenue */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Net Revenue
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                ${financials.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <ArrowUpRight size={13} />
                        <span className="text-[11px]">Gross: ${financials.grossRevenue.toFixed(2)} ({financials.currency})</span>
                    </div>
                </Card>

                {/* Total Orders */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Total Orders
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                {orders.totalOrders.toLocaleString()}
                            </div>
                        </div>
                        <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <ShoppingBag size={16} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>{orders.breakdown.byFulfillmentStatus?.DELIVERED || 0} Delivered</span>
                        <span>•</span>
                        <span>{orders.breakdown.byOrderStatus?.PENDING || 0} Pending</span>
                    </div>
                </Card>

                {/* Total Customers */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Active Customers
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                {customers.totalCustomers.toLocaleString()}
                            </div>
                        </div>
                        <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-500 dark:text-neutral-400">
                        <span>{customers.activeCustomersCount || 0} active users</span>
                    </div>
                </Card>

                {/* Low Stock Alerts */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                Stock Attention
                            </div>
                            <div className={`text-xl font-bold mt-1 ${inventory.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                                {inventory.lowStockCount.toLocaleString()}
                            </div>
                        </div>
                        <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 mt-2 text-[11px] ${inventory.outOfStockCount > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-neutral-400"}`}>
                        <span>{inventory.outOfStockCount} items out of stock</span>
                    </div>
                </Card>
            </div>

            {/* Operational Status Breakdown */}
            <Card className="p-3.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2.5">
                    Fulfillment Pipeline
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-lg">
                        <Clock size={16} className="text-amber-500" />
                        <div>
                            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-neutral-500">Pending</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{orders.breakdown.byOrderStatus.PENDING || 0}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-lg">
                        <PackageCheck size={16} className="text-blue-500" />
                        <div>
                            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-neutral-500">Confirmed</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{orders.breakdown.byOrderStatus.CONFIRMED || 0}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-lg">
                        <Truck size={16} className="text-purple-500" />
                        <div>
                            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-neutral-500">Shipped</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{orders.breakdown.byFulfillmentStatus?.SHIPPED || 0}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800 rounded-lg">
                        <PackageCheck size={16} className="text-emerald-500" />
                        <div>
                            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-neutral-500">Delivered</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">{orders.breakdown.byFulfillmentStatus?.DELIVERED || 0}</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tables Grid: Recent Orders & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Orders */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">Recent Orders</div>
                        <Badge variant="neutral" size="sm">{recentOrders.length} latest</Badge>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders.length === 0 ? (
                                <TableRow noHover>
                                    <TableCell colSpan={4} className="text-center text-slate-400 dark:text-neutral-500 py-6 text-xs">
                                        No recent orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentOrders.map((row: AdminRecentOrderItem) => {
                                    const variant = getOrderStatusBadgeVariant(row.orderStatus);
                                    return (
                                        <TableRow key={row.orderNumber}>
                                            <TableCell>
                                                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">
                                                    {row.orderNumber}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-slate-700 dark:text-neutral-300 text-xs truncate max-w-[120px]">{row.customerEmail}</TableCell>
                                            <TableCell className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">${row.grandTotal.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant={variant} size="sm">{row.orderStatus}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Low Stock Items */}
                <Card className="p-3.5">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">Stock Attention Needed</div>
                        <Badge variant={lowStockAlerts.length > 0 ? "warning" : "success"} size="sm">
                            {lowStockAlerts.length} items
                        </Badge>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product / SKU</TableHead>
                                <TableHead>In Stock</TableHead>
                                <TableHead>Threshold</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowStockAlerts.length === 0 ? (
                                <TableRow noHover>
                                    <TableCell colSpan={4} className="text-center text-slate-400 dark:text-neutral-500 py-6 text-xs">
                                        All inventory levels are healthy
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lowStockAlerts.map((row: AdminLowStockItem) => (
                                    <TableRow key={`${row.productId}-${row.variantId}`}>
                                        <TableCell>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">{row.productTitle || "Product Variant"}</div>
                                                <div className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">{row.sku || row.variantId}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-bold text-xs ${row.onHand === 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                {row.onHand}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 dark:text-neutral-400 text-xs">{row.reorderThreshold}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.onHand === 0 ? "danger" : "warning"} size="sm">
                                                {row.onHand === 0 ? "OUT" : "LOW"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    </RequireRole>
);
}
