"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import type { ProductResponse } from "@ecommers/types";
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
    ConfirmDialog,
    Input,
    Select,
    TableAction,
    TableActionGroup,
} from "@ecommers/ui";
import {
    Package,
    Plus,
    Search,
    Edit,
    Trash2,
    Star,
    RefreshCw,
} from "lucide-react";

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Pagination
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Delete dialog
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchProducts = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await api.products.list({
                page,
                limit: 10,
                ...(statusFilter ? { status: statusFilter as any } : {}),
            });
            setProducts(res.items || []);
            setTotalPages(res.pagination?.totalPages || 1);
            setTotalItems(res.pagination?.total || 0);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load catalog products.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, statusFilter]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleDeleteProduct = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await api.products.delete(productToDelete);
            setProductToDelete(null);
            fetchProducts(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Failed to delete product: ${err.message}`);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PUBLISHED":
                return <Badge variant="success" size="sm">PUBLISHED</Badge>;
            case "DRAFT":
                return <Badge variant="warning" size="sm">DRAFT</Badge>;
            case "ARCHIVED":
                return <Badge variant="neutral" size="sm">ARCHIVED</Badge>;
            default:
                return <Badge variant="neutral" size="sm">{status}</Badge>;
        }
    };

    const displayed = search.trim()
        ? products.filter(
              (p) =>
                  p.title.toLowerCase().includes(search.toLowerCase()) ||
                  p.brand?.toLowerCase().includes(search.toLowerCase())
          )
        : products;

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Package size={16} />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Products
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                        Manage your store catalog, pricing, variants, and stock status.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchProducts(true)}
                        isLoading={refreshing}
                    >
                        <RefreshCw size={13} className="mr-1.5" />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => router.push("/products/new")}
                    >
                        <Plus size={14} className="mr-1" />
                        <span>Add Product</span>
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
                            placeholder="Search products by title or brand..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="w-40">
                        <Select
                            size="sm"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                        </Select>
                    </div>

                    {(search || statusFilter) && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter("");
                                setPage(1);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </Card>

            {/* Products Table Card */}
            <Card className="p-3.5">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2.5">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Loading catalog...</p>
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Failed to load products"
                        message={error}
                        onRetry={() => fetchProducts()}
                    />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Variants</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayed.length === 0 ? (
                                    <TableRow noHover>
                                        <TableCell colSpan={7} className="text-center text-slate-400 dark:text-neutral-500 py-10 text-xs">
                                            No products found. Click &apos;Add Product&apos; to create one.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayed.map((p) => {
                                        const defaultVariant = p.variants?.[0];
                                        const inrPrice = defaultVariant?.prices?.find((pr) => pr.currency === "INR")?.amount;
                                        const usdPrice = defaultVariant?.prices?.find((pr) => pr.currency === "USD")?.amount;
                                        const displayPrice = inrPrice !== undefined
                                            ? `₹${inrPrice.toFixed(2)}`
                                            : usdPrice !== undefined
                                                ? `$${usdPrice.toFixed(2)}`
                                                : defaultVariant?.prices?.[0]
                                                    ? `${defaultVariant.prices[0].currency} ${defaultVariant.prices[0].amount.toFixed(2)}`
                                                    : "—";
                                        const dateStr = new Date(p.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div>
                                                        <div
                                                            onClick={() => router.push(`/products/${p.id}`)}
                                                            className="font-semibold text-slate-900 dark:text-neutral-100 text-xs hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                                                        >
                                                            {p.title}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 dark:text-neutral-500">
                                                            {p.brand || "Brand"} • Slug: {p.slug}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                                <TableCell>{p.variants?.length || 1} variants</TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-neutral-100">
                                                    {displayPrice}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-xs font-semibold">
                                                        <Star size={12} className="fill-amber-400 text-amber-400" />
                                                        <span>{p.averageRating?.toFixed(1) || "5.0"}</span>
                                                        <span className="text-slate-400 dark:text-neutral-500 font-normal">({p.reviewCount || 0})</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-neutral-400">{dateStr}</TableCell>
                                                <TableCell className="text-right">
                                                    <TableActionGroup>
                                                        <TableAction
                                                            icon={<Edit size={14} />}
                                                            label="Edit"
                                                            variant="primary"
                                                            onClick={() => router.push(`/products/${p.id}`)}
                                                        />
                                                        <TableAction
                                                            icon={<Trash2 size={14} />}
                                                            label="Delete"
                                                            variant="destructive"
                                                            onClick={() => setProductToDelete(p.id)}
                                                        />
                                                    </TableActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {totalPages > 1 && (
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    Showing page {page} of {totalPages} ({totalItems} items)
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

            <ConfirmDialog
                isOpen={!!productToDelete}
                onClose={() => !isDeleting && setProductToDelete(null)}
                onConfirm={handleDeleteProduct}
                title="Delete Product"
                description="Are you sure you want to delete this product? This will permanently remove it from catalog discovery."
                confirmLabel={isDeleting ? "Deleting..." : "Delete"}
                variant="danger"
            />
        </div>
    );
}
