"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus } from "@ecommers/types";
import { useGetProductsQuery, useDeleteProductMutation } from "../../../store/api/admin-api";
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
    Globe,
} from "lucide-react";

export default function ProductsPage() {
    const router = useRouter();

    // Filters & Pagination
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // RTK Query hooks
    const {
        data,
        isLoading: loading,
        isFetching: refreshing,
        error: queryError,
        refetch,
    } = useGetProductsQuery({
        page,
        limit: pageSize,
        ...(statusFilter ? { status: statusFilter as ProductStatus } : {}),
    });

    const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

    const products = data?.items || [];
    const totalPages = data?.totalPages || 1;
    const totalItems = data?.total || 0;
    const error = queryError
        ? "message" in queryError
            ? (queryError.message as string)
            : "Failed to load catalog products."
        : null;

    // Delete dialog
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const handleDeleteProduct = async () => {
        if (!productToDelete) return;
        try {
            await deleteProduct(productToDelete).unwrap();
            setProductToDelete(null);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "message" in err) {
                alert(`Failed to delete product: ${(err as any).message}`);
            } else {
                alert("Failed to delete product.");
            }
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
                        onClick={() => router.push("/seo/bulk?type=PRODUCT")}
                        className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30"
                    >
                        <Globe size={13} />
                        <span>Bulk SEO</span>
                    </Button>
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

            {/* Products Table Card */}
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2.5">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-neutral-400">Loading catalog...</p>
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <ErrorState
                            title="Failed to load products"
                            message={error}
                            onRetry={() => refetch()}
                        />
                    </div>
                ) : (
                    <>
                        <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Variants</TableHead>
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
