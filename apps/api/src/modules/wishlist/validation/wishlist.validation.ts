import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getWishlistQuerySchema = z.object({
    currency: z
        .string()
        .trim()
        .length(3, "Currency must be a 3-letter ISO code")
        .toUpperCase()
        .default("USD")
        .optional(),
});

export const addToWishlistSchema = z
    .object({
        productId: z
            .string()
            .trim()
            .regex(objectIdRegex, "Invalid product ID format"),
        variantId: z
            .string()
            .trim()
            .min(1, "variantId must not be empty"),
    })
    .strict();

export const wishlistVariantParamSchema = z.object({
    variantId: z
        .string()
        .trim()
        .min(1, "variantId parameter must not be empty"),
});

export const moveWishlistItemToCartSchema = z
    .object({
        quantity: z
            .coerce
            .number()
            .int()
            .positive("Quantity must be greater than 0")
            .default(1)
            .optional(),
        currency: z
            .string()
            .trim()
            .length(3, "Currency must be a 3-letter ISO code")
            .toUpperCase()
            .optional(),
    })
    .strict();

export type AddToWishlistSchema = z.infer<typeof addToWishlistSchema>;
export type MoveWishlistItemToCartSchema = z.infer<typeof moveWishlistItemToCartSchema>;
