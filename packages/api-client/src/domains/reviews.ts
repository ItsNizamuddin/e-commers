import type { ApiClient } from "../client.js";
import type { ReviewResponse, ProductReviewsResponse, CreateReviewInput, UpdateReviewInput, ReviewQueryOptions } from "@ecommers/types";

export class ReviewsClient {
    constructor(private readonly client: ApiClient) {}

    async list(productId: string, params?: ReviewQueryOptions): Promise<ProductReviewsResponse> {
        return this.client.get<ProductReviewsResponse>(`/reviews/product/${productId}`, { params });
    }

    async create(productId: string, body: CreateReviewInput): Promise<ReviewResponse> {
        return this.client.post<ReviewResponse>(`/reviews/product/${productId}`, body);
    }

    async update(reviewId: string, body: UpdateReviewInput): Promise<ReviewResponse> {
        return this.client.patch<ReviewResponse>(`/reviews/${reviewId}`, body);
    }

    async delete(reviewId: string): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>(`/reviews/${reviewId}`);
    }

    async voteHelpful(reviewId: string): Promise<{ helpfulVotes: number; voted: boolean }> {
        return this.client.post<{ helpfulVotes: number; voted: boolean }>(`/reviews/${reviewId}/vote`);
    }
}
