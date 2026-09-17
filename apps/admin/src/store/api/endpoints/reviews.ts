import { adminApi } from "../admin-api";
import type { ReviewResponse, ProductReviewsResponse, UpdateReviewInput, ReviewQueryOptions } from "@ecommers/types";

export const reviewsApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getProductReviews: builder.query<ProductReviewsResponse, { productId: string; params?: ReviewQueryOptions }>({
            query: ({ productId, params }) => ({
                url: `/reviews/product/${productId}`,
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const reviews = Array.isArray(response?.reviews) ? [...response.reviews] : [];
                return {
                    reviews,
                    summary: response?.summary || { averageRating: 5.0, totalReviews: reviews.length },
                    pagination: response?.pagination || { page: 1, limit: 10, total: reviews.length, totalPages: 1 },
                };
            },
            providesTags: (_res, _err, { productId }) => [
                { type: "Reviews", id: productId },
                { type: "Reviews", id: "LIST" },
            ],
        }),

        updateReview: builder.mutation<ReviewResponse, { reviewId: string; body: UpdateReviewInput; productId?: string }>({
            query: ({ reviewId, body }) => ({
                url: `/reviews/${reviewId}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { productId }) => [
                { type: "Reviews", id: "LIST" },
                ...(productId ? [{ type: "Reviews" as const, id: productId }] : []),
            ],
        }),

        deleteReview: builder.mutation<{ message: string }, { reviewId: string; productId?: string }>({
            query: ({ reviewId }) => ({
                url: `/reviews/${reviewId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_res, _err, { productId }) => [
                { type: "Reviews", id: "LIST" },
                ...(productId ? [{ type: "Reviews" as const, id: productId }] : []),
            ],
        }),
    }),
});

export const {
    useGetProductReviewsQuery,
    useUpdateReviewMutation,
    useDeleteReviewMutation,
} = reviewsApi;
