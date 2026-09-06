export type ReviewStatus = "APPROVED" | "FLAGGED" | "REJECTED";

export interface ReviewResponse {
    id: string;
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    title?: string;
    comment: string;
    isVerifiedPurchase: boolean;
    helpfulVotes: number;
    hasVotedHelpful?: boolean;
    status: ReviewStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ReviewRatingBreakdown {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
}

export interface ProductReviewsSummary {
    productId: string;
    averageRating: number;
    totalReviews: number;
    breakdown: ReviewRatingBreakdown;
}

export interface ProductReviewsResponse {
    summary: ProductReviewsSummary;
    reviews: ReviewResponse[];
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface CreateReviewInput {
    rating: number;
    title?: string;
    comment: string;
}

export interface UpdateReviewInput {
    rating?: number;
    title?: string;
    comment?: string;
}

export interface ReviewQueryOptions {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: "newest" | "highest" | "lowest" | "helpful";
}
