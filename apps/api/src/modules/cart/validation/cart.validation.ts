import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
    .string()
    .regex(objectIdRegex, "Invalid ObjectId format");

export const addToCartSchema = z.object({
    productId: objectIdSchema,
    variantId: z.string().min(1, "variantId is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").toUpperCase().optional(),
    expectedVersion: z.number().int().min(1).optional(),
});

export const updateCartItemQuantitySchema = z.object({
    quantity: z.number().int().min(0, "Quantity cannot be negative"),
    expectedVersion: z.number().int().min(1).optional(),
});

export const variantIdParamSchema = z.object({
    variantId: z.string().min(1, "variantId is required"),
});

export const mergeCartSchema = z.object({
    sessionId: z.string().optional(),
});
