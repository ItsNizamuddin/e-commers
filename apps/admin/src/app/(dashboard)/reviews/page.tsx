"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
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
} from "@ecommers/ui";
import {
    Star,
    Trash2,
    RefreshCw,
    CheckCircle2,
    MessageSquare,
    ThumbsUp,
} from "lucide-react";

export default function ReviewsPage() {
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [reviews, setReviews] = useState<ReviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Summary
    const [avgRating, setAvgRating] = useState(5.0);
    const [totalReviews, setTotalReviews] = useState(0);

    // Delete dialog
    const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    // Load initial products list
    useEffect(() => {
        api.products.list({ limit: 50 }).then((res) => {
            const prods = res.items || [];
            setProducts(prods);
            if (prods.length > 0) {
                setSelectedProductId(prods[0].id);
            }
        }).catch(() => {});
    }, []);

    const fetchReviews = useCallback(async (isManual = false) => {
        if (!selectedProductId) return;

        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const res = await api.reviews.list(selectedProductId);
            setReviews(res.reviews || []);
            setAvgRating(res.summary?.averageRating || 5.0);
            setTotalReviews(res.summary?.totalReviews || 0);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load reviews for this product.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedProductId]);

    useEffect(() => {
        if (selectedProductId) {
            fetchReviews();
        } else {
            setLoading(false);
        }
    }, [selectedProductId, fetchReviews]);

    const handleDeleteReview = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            await api.reviews.delete(reviewToDelete);
            setReviewToDelete(null);
            setNotice("Review deleted successfully.");
            setTimeout(() => setNotice(null), 3000);
            fetchReviews(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Delete failed: ${err.message}`);
            }
        } finally {
            setIsDeleting(false);
        }
    };

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
                            <Star size={18} />
                        </div>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
                            Reviews Moderation
                        </h1>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Moderate customer feedback, verify purchases, and maintain catalog ratings integrity.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchReviews(true)}
                        isLoading={refreshing}
                        style={{ borderRadius: "8px" }}
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {notice && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.875rem" }}>
                    <CheckCircle2 size={16} />
                    <span>{notice}</span>
                </div>
            )}

            {/* Product Selector Card */}
            <Card style={{ padding: "1.25rem", backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}>
                        Select Product:
                    </span>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        style={{
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: "0.8125rem",
                            color: "#0f172a",
                            outline: "none",
                            flex: "1 1 300px",
                        }}
                    >
                        {products.length === 0 ? (
                            <option value="">No products available</option>
                        ) : (
                            products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title} ({p.reviewCount || 0} reviews • ★{p.averageRating?.toFixed(1) || "5.0"})
                                </option>
                            ))
                        )}
                    </select>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <Star size={16} fill="#f59e0b" color="#f59e0b" />
                            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{avgRating.toFixed(1)}</span>
                        </div>
                        <Badge variant="neutral" size="sm">{totalReviews} total reviews</Badge>
                    </div>
                </div>
            </Card>

            {/* Reviews Table Card */}
            <Card style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 0", gap: "1rem" }}>
                        <Spinner size="md" />
                        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading reviews...</p>
                    </div>
                ) : error ? (
                    <ErrorState title="Failed to load reviews" message={error} onRetry={() => fetchReviews()} />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reviewer</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead>Title & Comment</TableHead>
                                <TableHead>Verified</TableHead>
                                <TableHead>Helpful</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead style={{ textAlign: "right" }}>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reviews.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "3rem 0" }}>
                                        No reviews posted for this product yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reviews.map((r) => {
                                    const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    });

                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                                    {r.userName || "Customer"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div style={{ display: "flex", gap: "2px" }}>
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star
                                                            key={s}
                                                            size={12}
                                                            fill={s <= r.rating ? "#f59e0b" : "#e2e8f0"}
                                                            color={s <= r.rating ? "#f59e0b" : "#e2e8f0"}
                                                        />
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    {r.title && (
                                                        <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#0f172a" }}>
                                                            {r.title}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
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
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#64748b" }}>
                                                    <ThumbsUp size={12} />
                                                    <span>{r.helpfulVotes || 0}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                {dateStr}
                                            </TableCell>
                                            <TableCell style={{ textAlign: "right" }}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setReviewToDelete(r.id)}
                                                    style={{ color: "#dc2626", padding: "0.25rem 0.5rem" }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
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
