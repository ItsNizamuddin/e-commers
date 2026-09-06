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
} from "@ecommers/ui";
import {
    Package,
    Plus,
    Search,
    Edit,
    Trash2,
    Star,
    CheckCircle2,
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
                            <Package size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Product Catalog
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Manage e-commerce products, variants, multi-currency pricing, and publication states.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchProducts(true)}
                        isLoading={refreshing}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => router.push("/products/new")}
                        style={{ backgroundColor: "#2563eb", borderRadius: "8px", gap: "0.375rem" }}
                    >
                        <Plus size={15} />
                        <span>Add Product</span>
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
                            placeholder="Search by title or brand..."
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

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
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
                        <option value="">All Statuses</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>

                    {(search || statusFilter) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter("");
                                setPage(1);
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            </Card>

            {/* Products Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading catalog...</p>
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
                                    <TableHead>Base Price (USD)</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayed.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                            No products found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayed.map((p) => {
                                        const defaultVariant = p.variants?.[0];
                                        const usdPrice = defaultVariant?.prices?.find((pr) => pr.currency === "USD")?.amount || 0;
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
                                                            style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.875rem", cursor: "pointer" }}
                                                        >
                                                            {p.title}
                                                        </div>
                                                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                            {p.brand || "ecommers"} • Slug: {p.slug}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(p.status)}</TableCell>
                                                <TableCell>{p.variants?.length || 1} variants</TableCell>
                                                <TableCell style={{ fontWeight: 700, color: "#0f172a" }}>
                                                    ${usdPrice.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8125rem", fontWeight: 600 }}>
                                                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                                        <span>{p.averageRating?.toFixed(1) || "5.0"}</span>
                                                        <span style={{ color: "#94a3b8", fontWeight: 400 }}>({p.reviewCount || 0})</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>{dateStr}</TableCell>
                                                <TableCell style={{ textAlign: "right" }}>
                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.25rem" }}>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/products/${p.id}`)}
                                                            style={{ color: "#2563eb", padding: "0.25rem 0.5rem" }}
                                                        >
                                                            <Edit size={14} />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setProductToDelete(p.id)}
                                                            style={{ color: "#dc2626", padding: "0.25rem 0.5rem" }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
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
