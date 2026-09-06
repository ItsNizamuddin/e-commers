"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import type { OrderResponse } from "@ecommers/types";
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
    Pagination,
    Button,
} from "@ecommers/ui";
import {
    ShoppingBag,
    Search,
    Clock,
    Truck,
    CheckCircle2,
    XCircle,
    ArrowRight,
    RefreshCw,
    Filter,
} from "lucide-react";

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Pagination
    const [search, setSearch] = useState("");
    const [orderStatus, setOrderStatus] = useState<string>("");
    const [fulfillmentStatus, setFulfillmentStatus] = useState<string>("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchOrders = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const res = await api.orders.adminList({
                page,
                limit: 10,
                ...(orderStatus ? { orderStatus: orderStatus as any } : {}),
                ...(fulfillmentStatus ? { fulfillmentStatus: fulfillmentStatus as any } : {}),
            });
            setOrders(res.items || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotalItems(res.pagination?.total || 0);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to retrieve order records.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, orderStatus, fulfillmentStatus]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const getFulfillmentBadge = (status: string) => {
        switch (status) {
            case "DELIVERED":
                return <Badge variant="success" size="sm">DELIVERED</Badge>;
            case "SHIPPED":
                return <Badge variant="primary" size="sm">SHIPPED</Badge>;
            case "PROCESSING":
                return <Badge variant="warning" size="sm">PROCESSING</Badge>;
            case "UNFULFILLED":
                return <Badge variant="danger" size="sm">UNFULFILLED</Badge>;
            case "RETURNED":
                return <Badge variant="neutral" size="sm">RETURNED</Badge>;
            default:
                return <Badge variant="neutral" size="sm">{status}</Badge>;
        }
    };

    const getPaymentBadge = (status: string) => {
        switch (status) {
            case "CAPTURED":
                return <Badge variant="success" size="sm">PAID</Badge>;
            case "AUTHORIZED":
                return <Badge variant="info" size="sm">AUTHORIZED</Badge>;
            case "PENDING":
                return <Badge variant="warning" size="sm">PENDING</Badge>;
            case "REFUNDED":
            case "PARTIALLY_REFUNDED":
                return <Badge variant="primary" size="sm">REFUNDED</Badge>;
            case "FAILED":
                return <Badge variant="danger" size="sm">FAILED</Badge>;
            default:
                return <Badge variant="neutral" size="sm">{status}</Badge>;
        }
    };

    // Filter by client search if text entered
    const displayedOrders = search.trim()
        ? orders.filter(
              (o) =>
                  o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                  (o.customerEmailSnapshot && o.customerEmailSnapshot.toLowerCase().includes(search.toLowerCase()))
          )
        : orders;

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
                            <ShoppingBag size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Orders Ledger
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Monitor real-time fulfillment pipelines, manage customer orders, and issue tracking.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrders(true)}
                        isLoading={refreshing}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar Card */}
            <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                    {/* Search Input */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "0.4rem 0.75rem",
                            flex: "1 1 240px",
                        }}
                    >
                        <Search size={16} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Search by order # or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                border: "none",
                                background: "transparent",
                                fontSize: "0.8125rem",
                                outline: "none",
                                width: "100%",
                                color: "#0f172a",
                            }}
                        />
                    </div>

                    {/* Order Status Dropdown */}
                    <select
                        value={orderStatus}
                        onChange={(e) => {
                            setOrderStatus(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: "0.8125rem",
                            color: "#0f172a",
                            outline: "none",
                        }}
                    >
                        <option value="">All Order Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    {/* Fulfillment Status Dropdown */}
                    <select
                        value={fulfillmentStatus}
                        onChange={(e) => {
                            setFulfillmentStatus(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: "0.8125rem",
                            color: "#0f172a",
                            outline: "none",
                        }}
                    >
                        <option value="">All Fulfillment States</option>
                        <option value="UNFULFILLED">Unfulfilled</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="RETURNED">Returned</option>
                    </select>

                    {(search || orderStatus || fulfillmentStatus) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setOrderStatus("");
                                setFulfillmentStatus("");
                                setPage(1);
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "0.25rem 0.5rem",
                            }}
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            </Card>

            {/* Content Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading order records...</p>
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Failed to load orders"
                        message={error}
                        onRetry={() => fetchOrders()}
                    />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Fulfillment</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                            No matching orders found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayedOrders.map((order) => {
                                        const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });

                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <span
                                                        onClick={() => router.push(`/orders/${order.id}`)}
                                                        style={{
                                                            fontFamily: "monospace",
                                                            fontWeight: 700,
                                                            color: "#2563eb",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        {order.orderNumber}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.8125rem" }}>
                                                        {order.customerEmailSnapshot || "Guest Checkout"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{order.items?.length || 0} items</TableCell>
                                                <TableCell style={{ fontWeight: 700, color: "#0f172a" }}>
                                                    ${(order.pricing?.grandTotalMinor ? order.pricing.grandTotalMinor / 100 : 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                                                <TableCell>{getFulfillmentBadge(order.fulfillmentStatus)}</TableCell>
                                                <TableCell style={{ color: "#64748b", fontSize: "0.75rem" }}>{dateStr}</TableCell>
                                                <TableCell style={{ textAlign: "right" }}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/orders/${order.id}`)}
                                                        style={{ color: "#2563eb", fontWeight: 600 }}
                                                    >
                                                        <span>View</span>
                                                        <ArrowRight size={13} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    Showing page {page} of {totalPages} ({totalItems} orders)
                                </span>
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={(p) => setPage(p)}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
