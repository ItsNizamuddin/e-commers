import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const searchQuerySchema = z
    .object({
        q: z
            .string()
            .trim()
            .optional(),
        categoryId: z
            .string()
            .trim()
            .regex(objectIdRegex, "Invalid categoryId format")
            .optional(),
        brand: z
            .string()
            .trim()
            .optional(),
        minPrice: z
            .coerce
            .number()
            .min(0, "minPrice must be non-negative")
            .optional(),
        maxPrice: z
            .coerce
            .number()
            .min(0, "maxPrice must be non-negative")
            .optional(),
        currency: z
            .string()
            .trim()
            .length(3, "Currency must be a 3-letter ISO code")
            .toUpperCase()
            .default("USD"),
        inStock: z
            .enum(["true", "false"])
            .transform((v) => v === "true")
            .optional(),
        minRating: z
            .coerce
            .number()
            .min(1, "minRating must be between 1 and 5")
            .max(5, "minRating must be between 1 and 5")
            .optional(),
        page: z
            .coerce
            .number()
            .int()
            .min(1, "page must be at least 1")
            .default(1),
        limit: z
            .coerce
            .number()
            .int()
            .min(1, "limit must be at least 1")
            .max(50, "limit cannot exceed 50")
            .default(20),
        sortBy: z
            .enum(["relevance", "price_asc", "price_desc", "rating", "newest"])
            .optional(),
    })
    .refine(
        (data) => {
            if (data.minPrice !== undefined && data.maxPrice !== undefined) {
                return data.minPrice <= data.maxPrice;
            }
            return true;
        },
        {
            message: "minPrice cannot be greater than maxPrice",
            path: ["minPrice"],
        }
    );

export type SearchQuerySchema = z.infer<typeof searchQuerySchema>;
