import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createReviewSchema = z
    .object({
        rating: z
            .coerce
            .number()
            .int()
            .min(1, "Rating must be between 1 and 5")
            .max(5, "Rating must be between 1 and 5"),
        title: z
            .string()
            .trim()
            .max(120, "Title must not exceed 120 characters")
            .optional(),
        comment: z
            .string()
            .trim()
            .min(5, "Review comment must be at least 5 characters")
            .max(2000, "Review comment must not exceed 2000 characters"),
    })
    .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
    .object({
        rating: z
            .coerce
            .number()
            .int()
            .min(1, "Rating must be between 1 and 5")
            .max(5, "Rating must be between 1 and 5")
            .optional(),
        title: z
            .string()
            .trim()
            .max(120, "Title must not exceed 120 characters")
            .optional(),
        comment: z
            .string()
            .trim()
            .min(5, "Review comment must be at least 5 characters")
            .max(2000, "Review comment must not exceed 2000 characters")
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field (rating, title, or comment) must be provided for update",
    });

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const productIdParamsSchema = z.object({
    productId: z.string().regex(objectIdRegex, "Invalid Product ID format"),
});

export const reviewIdParamsSchema = z.object({
    id: z.string().regex(objectIdRegex, "Invalid Review ID format"),
});

export const reviewQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(50).optional().default(10),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sortBy: z.enum(["newest", "highest", "lowest", "helpful"]).optional().default("newest"),
});

export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
