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
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6rem 0",
                    gap: "1rem",
                }}
            >
                <Spinner size="lg" />
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading backoffice intelligence...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ padding: "3rem 0" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em" }}>
                    Executive Overview
                </h1>
                <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Real-time operational health, revenue metrics, and inventory alerts
                </p>
            </div>

            {/* KPI Metric Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                }}
            >
                {/* Total Revenue */}
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Net Revenue
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.375rem" }}>
                                ${financials.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "#16a34a" }}>
                        <ArrowUpRight size={14} />
                        <span>Gross: ${financials.grossRevenue.toFixed(2)} ({financials.currency})</span>
                    </div>
                </Card>

                {/* Total Orders */}
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Total Orders
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.375rem" }}>
                                {orders.totalOrders.toLocaleString()}
                            </div>
                        </div>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#f0fdf4",
                                color: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
                        <span>{orders.breakdown.byFulfillmentStatus?.DELIVERED || 0} Delivered</span>
                        <span>•</span>
                        <span>{orders.breakdown.byOrderStatus?.PENDING || 0} Pending</span>
                    </div>
                </Card>

                {/* Total Customers */}
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Active Customers
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: "0.375rem" }}>
                                {customers.totalCustomers.toLocaleString()}
                            </div>
                        </div>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#faf5ff",
                                color: "#9333ea",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Users size={20} />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
                        <span>{customers.activeCustomersCount || 0} active users</span>
                    </div>
                </Card>

                {/* Low Stock Alerts */}
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Stock Attention
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: inventory.lowStockCount > 0 ? "#b45309" : "#0f172a", marginTop: "0.375rem" }}>
                                {inventory.lowStockCount.toLocaleString()}
                            </div>
                        </div>
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "8px",
                                backgroundColor: "#fffbeb",
                                color: "#d97706",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.75rem", fontSize: "0.75rem", color: inventory.outOfStockCount > 0 ? "#dc2626" : "#64748b" }}>
                        <span>{inventory.outOfStockCount} items currently out of stock</span>
                    </div>
                </Card>
            </div>

            {/* Operational Status Breakdown */}
            <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: "1rem" }}>
                    Fulfillment Pipeline
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                        <Clock size={20} color="#f59e0b" />
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Pending</div>
                            <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{orders.breakdown.byOrderStatus.PENDING || 0}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                        <PackageCheck size={20} color="#3b82f6" />
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Confirmed</div>
                            <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{orders.breakdown.byOrderStatus.CONFIRMED || 0}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                        <Truck size={20} color="#8b5cf6" />
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Shipped</div>
                            <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{orders.breakdown.byFulfillmentStatus?.SHIPPED || 0}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                        <PackageCheck size={20} color="#10b981" />
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Delivered</div>
                            <div style={{ fontSize: "1.125rem", fontWeight: 700 }}>{orders.breakdown.byFulfillmentStatus?.DELIVERED || 0}</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tables Grid: Recent Orders & Low Stock */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))", gap: "1.5rem" }}>
                {/* Recent Orders */}
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>Recent Orders</div>
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
                                <TableRow>
                                    <TableCell colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                                        No recent orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentOrders.map((row: AdminRecentOrderItem) => {
                                    const variant = getOrderStatusBadgeVariant(row.orderStatus);
                                    return (
                                        <TableRow key={row.orderNumber}>
                                            <TableCell>
                                                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#2563eb", fontSize: "0.75rem" }}>
                                                    {row.orderNumber}
                                                </span>
                                            </TableCell>
                                            <TableCell>{row.customerEmail}</TableCell>
                                            <TableCell style={{ fontWeight: 600 }}>${row.grandTotal.toFixed(2)}</TableCell>
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
                <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>Stock Attention Needed</div>
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
                                <TableRow>
                                    <TableCell colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>
                                        All inventory levels are healthy
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lowStockAlerts.map((row: AdminLowStockItem) => (
                                    <TableRow key={`${row.productId}-${row.variantId}`}>
                                        <TableCell>
                                            <div>
                                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.productTitle || "Product Variant"}</div>
                                                <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>{row.sku || row.variantId}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: row.onHand === 0 ? "#dc2626" : "#d97706",
                                                }}
                                            >
                                                {row.onHand}
                                            </span>
                                        </TableCell>
                                        <TableCell style={{ color: "#64748b" }}>{row.reorderThreshold}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.onHand === 0 ? "danger" : "warning"} size="sm">
                                                {row.onHand === 0 ? "OUT OF STOCK" : "LOW STOCK"}
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
    );
}
