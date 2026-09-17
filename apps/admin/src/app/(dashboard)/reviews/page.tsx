"use client";

import React, { useState, useMemo } from "react";
import {
    useGetProductsQuery,
    useGetProductReviewsQuery,
    useDeleteReviewMutation,
} from "../../../store/api";
import type { ReviewResponse, ProductResponse } from "@ecommers/types";
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
    ConfirmDialog,
    Select,
    SearchableSelect,
    TableAction,
    TableActionGroup,
    Pagination,
} from "@ecommers/ui";
import {
    Star,
    Trash2,
    RefreshCw,
    CheckCircle2,
    ThumbsUp,
} from "lucide-react";

export default function ReviewsPage() {
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Delete dialog
    const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Products query
    const { data: productsData } = useGetProductsQuery({ limit: 50 });
    const products: ProductResponse[] = productsData?.items || [];

    const productOptions = useMemo(() => {
        return products.map((p) => ({
            value: p.id,
            label: p.title,
            subText: p.slug,
            badge: `${p.reviewCount || 0} reviews • ★${p.averageRating?.toFixed(1) || "5.0"}`,
        }));
    }, [products]);
    const activeProductId = selectedProductId || products[0]?.id || "";

    // Reviews query
    const {
        data: reviewsData,
        isLoading: reviewsLoading,
        isFetching: refreshing,
        error: reviewsError,
        refetch,
    } = useGetProductReviewsQuery(
        { productId: activeProductId },
        { skip: !activeProductId }
    );

    const [deleteReviewMutation, { isLoading: isDeleting }] = useDeleteReviewMutation();

    const reviews: ReviewResponse[] = reviewsData?.reviews || [];
    const totalPages = Math.ceil(reviews.length / pageSize) || 1;
    const paginatedReviews = reviews.slice((page - 1) * pageSize, page * pageSize);
    const avgRating = reviewsData?.summary?.averageRating ?? 5.0;
    const totalReviews = reviewsData?.summary?.totalReviews ?? 0;
    const loading = !activeProductId ? false : reviewsLoading;

    const handleDeleteReview = async () => {
        if (!reviewToDelete) return;
        try {
            await deleteReviewMutation({ reviewId: reviewToDelete, productId: activeProductId }).unwrap();
            setReviewToDelete(null);
            setNotice("Review deleted successfully.");
            setTimeout(() => setNotice(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Delete failed: ${err.message}`);
            } else {
                alert("Delete failed.");
            }
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Star size={15} />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Reviews Moderation
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Moderate customer feedback, verify purchases, and maintain catalog ratings integrity.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        isLoading={refreshing}
                        className="gap-1.5"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {notice && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs">
                    <CheckCircle2 size={15} />
                    <span>{notice}</span>
                </div>
            )}

            {/* Product Selector Card */}
            <Card className="p-3 sm:p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        Select Product:
                    </span>
                    <div className="flex-1 min-w-[280px]">
                        <SearchableSelect
                            value={selectedProductId}
                            onChange={(val) => {
                                setSelectedProductId(val);
                                setPage(1);
                            }}
                            options={productOptions}
                            placeholder="Select a product to view reviews..."
                            searchPlaceholder="Search product by title, slug..."
                            size="sm"
                            pageSize={15}
                        />
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                        <div className="flex items-center gap-1.5">
                            <Star size={15} className="fill-amber-400 text-amber-400" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{avgRating.toFixed(1)}</span>
                        </div>
                        <Badge variant="neutral" size="sm">{totalReviews} total reviews</Badge>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0 ml-2">
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
                </div>
            </Card>

            {/* Reviews Table Card */}
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Spinner size="md" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading reviews...</p>
                    </div>
                ) : reviewsError ? (
                    <div className="p-6">
                        <ErrorState
                            title="Failed to load reviews"
                            message={typeof reviewsError === "string" ? reviewsError : "An error occurred while fetching reviews."}
                            onRetry={() => refetch()}
                        />
                    </div>
                ) : (
                    <>
                        <Table className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] border-none rounded-none">
                            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                <TableRow>
                                    <TableHead>Reviewer</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Title & Comment</TableHead>
                                    <TableHead>Verified</TableHead>
                                    <TableHead>Helpful</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.length === 0 ? (
                                    <TableRow noHover>
                                        <TableCell colSpan={7} className="text-center text-slate-400 dark:text-slate-500 py-12">
                                            No reviews posted for this product yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedReviews.map((r) => {
                                        const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        });

                                        return (
                                            <TableRow key={r.id}>
                                                <TableCell>
                                                    <div className="font-bold text-slate-900 dark:text-slate-100">
                                                        {r.userName || "Customer"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                size={12}
                                                                className={s <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700"}
                                                            />
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        {r.title && (
                                                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                                                {r.title}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                                                            {r.comment}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {r.isVerifiedPurchase ? (
                                                        <Badge variant="success" size="sm">Verified</Badge>
                                                    ) : (
                                                        <Badge variant="neutral" size="sm">Standard</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                        <ThumbsUp size={12} />
                                                        <span>{r.helpfulVotes || 0}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                                                    {dateStr}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <TableActionGroup>
                                                        <TableAction
                                                            icon={<Trash2 size={14} />}
                                                            label="Delete"
                                                            variant="destructive"
                                                            onClick={() => setReviewToDelete(r.id)}
                                                            title="Delete Review"
                                                        />
                                                    </TableActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {reviews.length > 0 && (
                            <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    totalItems={reviews.length}
                                    pageSize={pageSize}
                                    onPageChange={setPage}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!reviewToDelete}
                onClose={() => !isDeleting && setReviewToDelete(null)}
                onConfirm={handleDeleteReview}
                title="Moderate / Delete Review"
                description="Are you sure you want to delete this review? Product average ratings will be recalculated automatically."
                confirmLabel={isDeleting ? "Deleting..." : "Delete Review"}
                variant="danger"
            />
        </div>
    );
}
