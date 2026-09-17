"use client";

import React, { useState } from "react";
import { useGetCustomersQuery } from "../../../store/api";
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
    Input,
    Select,
} from "@ecommers/ui";
import {
    Users,
    Search,
    RefreshCw,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"spend" | "orders" | "createdAt">("spend");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const {
        data,
        isLoading: loading,
        isFetching: refreshing,
        error: queryError,
        refetch,
    } = useGetCustomersQuery({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        sortBy,
        sortOrder: "desc",
    });

    const customers = data?.items || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const totalItems = data?.pagination?.total || 0;
    const error = queryError
        ? "message" in queryError
            ? (queryError.message as string)
            : "Failed to fetch customer accounts."
        : null;

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"]}>
            <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Users size={16} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Customers
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        Directory of registered customer profiles, purchase history, and lifetime values.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
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
                    <div className="flex-1 min-w-[200px]">
                        <Input
                            size="sm"
                            leadingIcon={<Search size={14} />}
                            placeholder="Search by customer name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400 whitespace-nowrap">Sort by:</span>
                        <div className="w-48">
                            <Select
                                size="sm"
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value as any);
                                    setPage(1);
                                }}
                            >
                                <option value="spend">Lifetime Spend (Highest)</option>
                                <option value="orders">Total Orders Count</option>
                                <option value="createdAt">Registration Date</option>
                            </Select>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
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
            </Card>

            {/* Customers Table Card */}
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2.5">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Loading customer accounts...</p>
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <ErrorState title="Failed to load customers" message={error} onRetry={() => refetch()} />
                    </div>
                ) : (
                    <>
                        <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
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
                                    <TableRow noHover>
                                        <TableCell colSpan={6} className="text-center text-slate-400 dark:text-neutral-500 py-10 text-xs">
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
                                                    <div className="font-semibold text-slate-900 dark:text-neutral-100 text-xs">
                                                        {c.firstName} {c.lastName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-neutral-300 text-xs">{c.email}</TableCell>
                                                <TableCell className="font-semibold text-blue-600 dark:text-blue-400 text-xs">
                                                    ${spendDecimal}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="neutral" size="sm">
                                                        {c.orderCount || 0} orders
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                                                    {lastOrderStr}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-neutral-400">
                                                    {joinedStr}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

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
                    </>
                )}
            </Card>
            </div>
        </RequireRole>
    );
}
