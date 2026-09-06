"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type { CustomerListItem } from "@ecommers/types";
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
    Users,
    Search,
    RefreshCw,
    DollarSign,
    ShoppingBag,
    Calendar,
} from "lucide-react";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<CustomerListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"spend" | "orders" | "createdAt">("spend");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchCustomers = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await api.admin.getCustomers({
                page,
                limit: 10,
                search: search.trim() || undefined,
                sortBy,
                sortOrder: "desc",
            });
            setCustomers(res.items || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotalItems(res.pagination?.total || 0);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to fetch customer accounts.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, search, sortBy]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

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
                            <Users size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Customer LTV & Accounts
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        View registered customer accounts, analyze order frequency, and discover high-value spenders.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCustomers(true)}
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
                            placeholder="Search by customer name or email..."
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

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value as any);
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
                            <option value="spend">Lifetime Spend (Highest first)</option>
                            <option value="orders">Total Orders Count</option>
                            <option value="createdAt">Registration Date</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Customers Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading customer accounts...</p>
                    </div>
                ) : error ? (
                    <ErrorState title="Failed to load customers" message={error} onRetry={() => fetchCustomers()} />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Lifetime Spend</TableHead>
                                    <TableHead>Orders</TableHead>
                                    <TableHead>Last Order</TableHead>
                                    <TableHead>Registered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                            No customer records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((c) => {
                                        const spendDecimal = c.lifetimeSpendMinor ? (c.lifetimeSpendMinor / 100).toFixed(2) : "0.00";
                                        const joinedStr = new Date(c.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });
                                        const lastOrderStr = c.lastOrderDate
                                            ? new Date(c.lastOrderDate).toLocaleDateString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                  year: "numeric",
                                              })
                                            : "No orders yet";

                                        return (
                                            <TableRow key={c.id}>
                                                <TableCell>
                                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                                        {c.firstName} {c.lastName}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{c.email}</TableCell>
                                                <TableCell style={{ fontWeight: 800, color: "#2563eb" }}>
                                                    ${spendDecimal}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="neutral" size="sm">
                                                        {c.orderCount || 0} orders
                                                    </Badge>
                                                </TableCell>
                                                <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                    {lastOrderStr}
                                                </TableCell>
                                                <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                    {joinedStr}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {totalPages > 1 && (
                            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    Showing page {page} of {totalPages} ({totalItems} customers)
                                </span>
                                <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
