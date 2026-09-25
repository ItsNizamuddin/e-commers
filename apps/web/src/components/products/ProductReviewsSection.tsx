"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ThumbsUp, CheckCircle, MessageSquarePlus, X } from "lucide-react";
import type { ProductReviewsResponse, ReviewResponse } from "@ecommers/types";
import { formatDate } from "../../lib/format";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { toast, Spinner } from "@ecommers/ui";

export interface ProductReviewsSectionProps {
    productId: string;
    initialReviews?: ProductReviewsResponse | null;
}

export function ProductReviewsSection({
    productId,
    initialReviews,
}: ProductReviewsSectionProps) {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const [reviews, setReviews] = useState<ReviewResponse[]>(initialReviews?.reviews || []);
    const summary = initialReviews?.summary;
    const [isWritingReview, setIsWritingReview] = useState(false);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const averageRating = summary?.averageRating ?? 0;
    const totalReviews = summary?.totalReviews ?? reviews.length;
    const breakdown = summary?.breakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    const handleVoteHelpful = async (reviewId: string) => {
        try {
            const res = await api.reviews.voteHelpful(reviewId);
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === reviewId
                        ? { ...r, helpfulVotes: res.helpfulVotes, hasVotedHelpful: res.voted }
                        : r
                )
            );
            toast.success("Thank you for your feedback!");
        } catch {
            toast.error("Failed to register vote");
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) {
            toast.error("Please provide review comments");
            return;
        }

        try {
            setIsSubmitting(true);
            const newReview = await api.reviews.create(productId, {
                rating,
                title: title.trim() || undefined,
                comment: comment.trim(),
            });

            setReviews((prev) => [newReview, ...prev]);
            setIsWritingReview(false);
            setTitle("");
            setComment("");
            toast.success("Review submitted for verification!");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to submit review";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 space-y-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
                <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                        Verified Customer Reviews
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Authentic feedback from verified purchasers of our farm harvest.
                    </p>
                </div>

                {isAuthenticated ? (
                    <button
                        type="button"
                        onClick={() => setIsWritingReview(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                    >
                        <MessageSquarePlus size={15} />
                        <span>Write a Review</span>
                    </button>
                ) : (
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors self-start sm:self-auto"
                    >
                        <span>Sign in to Review</span>
                    </Link>
                )}
            </div>

            {/* Rating Breakdown & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Score Column */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-extrabold text-zinc-900 font-mono tracking-tight">
                            {averageRating > 0 ? averageRating.toFixed(1) : "5.0"}
                        </span>
                        <span className="text-sm text-zinc-400 font-medium">/ 5.0</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={18}
                                className={star <= Math.round(averageRating || 5) ? "fill-amber-400" : "text-zinc-200"}
                            />
                        ))}
                    </div>

                    <p className="text-xs text-zinc-500">
                        Based on {totalReviews} customer {totalReviews === 1 ? "review" : "reviews"}
                    </p>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-8 space-y-2 text-xs">
                    {([5, 4, 3, 2, 1] as const).map((stars) => {
                        const count = breakdown ? breakdown[stars] || 0 : 0;
                        const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

                        return (
                            <div key={stars} className="flex items-center gap-3">
                                <span className="w-12 font-medium text-zinc-600 flex items-center gap-1 shrink-0">
                                    <span>{stars}</span>
                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                </span>

                                <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-amber-400 h-2 rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>

                                <span className="w-10 text-right font-mono text-zinc-400 shrink-0">
                                    {percentage}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Write Review Modal */}
            {isWritingReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                            <h3 className="font-bold text-base text-zinc-900">Write Product Review</h3>
                            <button
                                type="button"
                                onClick={() => setIsWritingReview(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitReview} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                    Rating
                                </label>
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setRating(s)}
                                            className="p-1 text-amber-400 hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                size={24}
                                                className={s <= rating ? "fill-amber-400" : "text-zinc-200"}
                                            />
                                        </button>
                                    ))}
                                    <span className="text-xs font-bold text-zinc-700 ml-2">
                                        {rating} of 5 Stars
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Headline (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Delicious fragrance and authentic aroma!"
                                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Review Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="How was the culinary taste, packaging, and freshness?"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsWritingReview(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner size="sm" className="text-white" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <span>Submit Review</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
                {reviews.length === 0 ? (
                    <div className="py-10 text-center text-zinc-400 space-y-2">
                        <Star size={28} className="mx-auto text-zinc-300 stroke-[1.5]" />
                        <p className="text-xs">No reviews submitted yet for this seasonal batch.</p>
                        <p className="text-[11px] text-zinc-500">Be the first verified customer to share your thoughts!</p>
                    </div>
                ) : (
                    reviews.map((rev) => (
                        <div
                            key={rev.id}
                            className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200/60 space-y-2.5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-zinc-900">{rev.userName}</span>
                                        {rev.isVerifiedPurchase && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                                <CheckCircle size={10} /> Verified Purchase
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center text-amber-400">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={12}
                                                    className={s <= rev.rating ? "fill-amber-400" : "text-zinc-200"}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[11px] text-zinc-400 font-mono">
                                            {formatDate(rev.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleVoteHelpful(rev.id)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                                        rev.hasVotedHelpful
                                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold"
                                            : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                                    }`}
                                    aria-label="Vote helpful"
                                >
                                    <ThumbsUp size={11} />
                                    <span>Helpful ({rev.helpfulVotes || 0})</span>
                                </button>
                            </div>

                            {rev.title && (
                                <h4 className="font-bold text-xs text-zinc-900">{rev.title}</h4>
                            )}

                            <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
