import { Types } from "mongoose";
import {
    ReviewResponse,
    ProductReviewsResponse,
    ProductReviewsSummary,
    ReviewRatingBreakdown,
} from "@ecommers/types";
import { AppError } from "../../../utils/app-error.js";
import { ReviewModel, ReviewDocument } from "../models/review.model.js";
import { ProductModel } from "../../products/product.model.js";
import { OrderModel } from "../../orders/models/order.model.js";
import { UserModel } from "../../users/user.model.js";
import type {
    CreateReviewInput,
    UpdateReviewInput,
    ReviewQuery,
} from "../validation/review.validation.js";

export class ReviewService {
    /**
     * Map Review Mongoose document to public ReviewResponse contract
     */
    private toReviewResponse(doc: ReviewDocument, currentUserId?: string): ReviewResponse {
        const hasVotedHelpful = currentUserId
            ? (doc.votedUserIds || []).some((id) => id.toString() === currentUserId)
            : false;

        return {
            id: doc._id.toString(),
            productId: doc.productId.toString(),
            userId: doc.userId.toString(),
            userName: doc.userName,
            rating: doc.rating,
            ...(doc.title ? { title: doc.title } : {}),
            comment: doc.comment,
            isVerifiedPurchase: doc.isVerifiedPurchase,
            helpfulVotes: doc.helpfulVotes || 0,
            hasVotedHelpful,
            status: doc.status,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    /**
     * Recalculates and denormalizes averageRating and reviewCount onto ProductModel
     */
    async recalculateProductRating(productId: string): Promise<{ averageRating: number; reviewCount: number }> {
        const pId = new Types.ObjectId(productId);
        const stats = await ReviewModel.aggregate([
            { $match: { productId: pId, status: "APPROVED" } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    total: { $sum: 1 },
                },
            },
        ]);

        const averageRating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
        const reviewCount = stats.length > 0 ? stats[0].total : 0;

        await ProductModel.findByIdAndUpdate(pId, { averageRating, reviewCount });

        return { averageRating, reviewCount };
    }

    /**
     * Customer creates a review with verified purchase enforcement
     */
    async createReview(
        userId: string,
        productId: string,
        input: CreateReviewInput
    ): Promise<ReviewResponse> {
        const uId = new Types.ObjectId(userId);
        const pId = new Types.ObjectId(productId);

        // 1. Verify Product exists
        const product = await ProductModel.findById(pId);
        if (!product || product.status === "ARCHIVED") {
            throw new AppError("Product not found or archived", 404, "PRODUCT_NOT_FOUND");
        }

        // 2. Prevent Duplicate Reviews (One active review per customer per product)
        const existingReview = await ReviewModel.findOne({ productId: pId, userId: uId });
        if (existingReview) {
            throw new AppError(
                "You have already reviewed this product. Please update your existing review.",
                409,
                "DUPLICATE_REVIEW"
            );
        }

        // 3. Verified Purchase Requirement: Must have an order containing this productId where fulfillmentStatus is DELIVERED
        const verifiedPurchase = await OrderModel.findOne({
            customerId: uId,
            "items.productId": productId,
            fulfillmentStatus: "DELIVERED",
        });

        if (!verifiedPurchase) {
            throw new AppError(
                "Only verified purchasers with a delivered order can write a review for this product.",
                403,
                "VERIFIED_PURCHASE_REQUIRED"
            );
        }

        // 4. Resolve Customer Name
        const user = await UserModel.findById(uId);
        const userName = user
            ? `${user.firstName} ${user.lastName ? user.lastName.charAt(0) + "." : ""}`.trim()
            : "Verified Customer";

        // 5. Create Review
        const review = await ReviewModel.create({
            productId: pId,
            userId: uId,
            userName,
            rating: input.rating,
            ...(input.title ? { title: input.title } : {}),
            comment: input.comment,
            isVerifiedPurchase: true,
            status: "APPROVED",
        });

        // 6. Recalculate Product averageRating and reviewCount
        await this.recalculateProductRating(productId);

        return this.toReviewResponse(review, userId);
    }

    /**
     * Get paginated reviews for a product with breakdown summary
     */
    async getProductReviews(
        productId: string,
        query: ReviewQuery,
        currentUserId?: string
    ): Promise<ProductReviewsResponse> {
        const pId = new Types.ObjectId(productId);
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const matchStage: Record<string, any> = {
            productId: pId,
            status: "APPROVED",
        };

        if (query.rating) {
            matchStage.rating = Number(query.rating);
        }

        let sortStage: Record<string, any> = { createdAt: -1 };
        if (query.sortBy === "highest") {
            sortStage = { rating: -1, createdAt: -1 };
        } else if (query.sortBy === "lowest") {
            sortStage = { rating: 1, createdAt: -1 };
        } else if (query.sortBy === "helpful") {
            sortStage = { helpfulVotes: -1, createdAt: -1 };
        }

        // Aggregation pipeline for paginated reviews and summary distribution
        const [aggregationResult] = await ReviewModel.aggregate([
            {
                $facet: {
                    reviews: [
                        { $match: matchStage },
                        { $sort: sortStage },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    totalFiltered: [
                        { $match: matchStage },
                        { $count: "count" },
                    ],
                    summary: [
                        { $match: { productId: pId, status: "APPROVED" } },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                avgRating: { $avg: "$rating" },
                            },
                        },
                    ],
                    distribution: [
                        { $match: { productId: pId, status: "APPROVED" } },
                        {
                            $group: {
                                _id: "$rating",
                                count: { $sum: 1 },
                            },
                        },
                    ],
                },
            },
        ]);

        const totalItems = aggregationResult?.totalFiltered?.[0]?.count || 0;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        const summaryStats = aggregationResult?.summary?.[0];
        const overallTotal = summaryStats?.total || 0;
        const overallAvg = summaryStats ? Math.round(summaryStats.avgRating * 10) / 10 : 0;

        const breakdown: ReviewRatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const d of aggregationResult?.distribution || []) {
            if (d._id >= 1 && d._id <= 5) {
                breakdown[d._id as keyof ReviewRatingBreakdown] = d.count;
            }
        }

        const summary: ProductReviewsSummary = {
            productId,
            averageRating: overallAvg,
            totalReviews: overallTotal,
            breakdown,
        };

        const reviews: ReviewResponse[] = (aggregationResult?.reviews || []).map((doc: any) =>
            this.toReviewResponse(doc, currentUserId)
        );

        return {
            summary,
            reviews,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    /**
     * Customer updates their existing review
     */
    async updateReview(
        reviewId: string,
        userId: string,
        input: UpdateReviewInput
    ): Promise<ReviewResponse> {
        const review = await ReviewModel.findById(reviewId);
        if (!review) {
            throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
        }

        if (review.userId.toString() !== userId) {
            throw new AppError("You can only edit your own review", 403, "FORBIDDEN");
        }

        let ratingChanged = false;
        if (input.rating !== undefined && input.rating !== review.rating) {
            review.rating = input.rating;
            ratingChanged = true;
        }

        if (input.title !== undefined) {
            review.title = input.title;
        }

        if (input.comment !== undefined) {
            review.comment = input.comment;
        }

        await review.save();

        if (ratingChanged) {
            await this.recalculateProductRating(review.productId.toString());
        }

        return this.toReviewResponse(review, userId);
    }

    /**
     * Customer or Admin deletes a review
     */
    async deleteReview(
        reviewId: string,
        userId: string,
        userRole: string
    ): Promise<{ message: string }> {
        const review = await ReviewModel.findById(reviewId);
        if (!review) {
            throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
        }

        const isAuthor = review.userId.toString() === userId;
        const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

        if (!isAuthor && !isAdmin) {
            throw new AppError("You do not have permission to delete this review", 403, "FORBIDDEN");
        }

        const productId = review.productId.toString();
        await ReviewModel.findByIdAndDelete(reviewId);

        await this.recalculateProductRating(productId);

        return { message: "Review deleted successfully" };
    }

    /**
     * Toggle helpful upvote on a review
     */
    async toggleHelpfulVote(
        reviewId: string,
        userId: string
    ): Promise<{ helpfulVotes: number; hasVotedHelpful: boolean }> {
        const uId = new Types.ObjectId(userId);
        const review = await ReviewModel.findById(reviewId);
        if (!review) {
            throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
        }

        const hasVoted = (review.votedUserIds || []).some((id) => id.equals(uId));

        if (hasVoted) {
            review.votedUserIds = (review.votedUserIds || []).filter((id) => !id.equals(uId));
            review.helpfulVotes = Math.max(0, (review.helpfulVotes || 1) - 1);
        } else {
            review.votedUserIds.push(uId);
            review.helpfulVotes = (review.helpfulVotes || 0) + 1;
        }

        await review.save();

        return {
            helpfulVotes: review.helpfulVotes,
            hasVotedHelpful: !hasVoted,
        };
    }
}

export const reviewService = new ReviewService();
