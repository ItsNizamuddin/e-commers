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
    Input,
    Select,
    TableAction,
    TableActionGroup,
} from "@ecommers/ui";
import {
    ShoppingBag,
    Search,
    ArrowRight,
    RefreshCw,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

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
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"]}>
            <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <ShoppingBag size={16} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Orders
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        Manage customer purchases, fulfillment stages, and payments.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchOrders(true)}
                        isLoading={refreshing}
                    >
                        <RefreshCw size={13} className="mr-1.5" />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar Card */}
            <Card className="p-3">
                <div className="flex flex-wrap gap-2.5 items-center">
                    {/* Search Input */}
                    <div className="flex-1 min-w-[200px]">
                        <Input
                            size="sm"
                            leadingIcon={<Search size={14} />}
                            placeholder="Search by order # or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Order Status Dropdown */}
                    <div className="w-40">
                        <Select
                            size="sm"
                            value={orderStatus}
                            onChange={(e) => {
                                setOrderStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Order Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </Select>
                    </div>

                    {/* Fulfillment Status Dropdown */}
                    <div className="w-44">
                        <Select
                            size="sm"
                            value={fulfillmentStatus}
                            onChange={(e) => {
                                setFulfillmentStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Fulfillment States</option>
                            <option value="UNFULFILLED">Unfulfilled</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="RETURNED">Returned</option>
                        </Select>
                    </div>

                    {(search || orderStatus || fulfillmentStatus) && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setOrderStatus("");
                                setFulfillmentStatus("");
                                setPage(1);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400"
                        >
                            Reset filters
                        </Button>
                    )}
                </div>
            </Card>

            {/* Content Table Card */}
            <Card className="p-3.5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2.5">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Loading order records...</p>
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedOrders.length === 0 ? (
                                    <TableRow noHover>
                                        <TableCell colSpan={8} className="text-center py-10">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <ShoppingBag size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                                        No orders found
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                                                        No customer orders matching your selected criteria.
                                                    </p>
                                                </div>
                                            </div>
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
                                                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-xs"
                                                    >
                                                        {order.orderNumber}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">
                                                        {order.customerEmailSnapshot || "Guest Checkout"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{order.items?.length || 0} items</TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-neutral-100">
                                                    ${(order.pricing?.grandTotalMinor ? order.pricing.grandTotalMinor / 100 : 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell>{getPaymentBadge(order.paymentStatus)}</TableCell>
                                                <TableCell>{getFulfillmentBadge(order.fulfillmentStatus)}</TableCell>
                                                <TableCell className="text-slate-500 dark:text-neutral-400 text-xs">{dateStr}</TableCell>
                                                <TableCell className="text-right">
                                                    <TableActionGroup>
                                                        <TableAction
                                                            icon={<ArrowRight size={14} />}
                                                            label="View"
                                                            variant="primary"
                                                            onClick={() => router.push(`/orders/${order.id}`)}
                                                        />
                                                    </TableActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>
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
    </RequireRole>
    );
}
