import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
    .string()
    .regex(objectIdRegex, "Invalid ObjectId format");

export const variantAvailabilityParamsSchema = z.object({
    productId: objectIdSchema,
    variantId: objectIdSchema,
});

export const inventoryIdParamSchema = z.object({
    id: objectIdSchema,
});

export const updateThresholdsSchema = z.object({
    expectedVersion: z
        .number()
        .int()
        .min(1, "expectedVersion must be a positive integer"),
    safetyStock: z
        .number()
        .int()
        .min(0, "safetyStock must be non-negative")
        .optional(),
    reorderThreshold: z
        .number()
        .int()
        .min(0, "reorderThreshold must be non-negative")
        .optional(),
    allowBackorder: z.boolean().optional(),
});

export const inventoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    productId: objectIdSchema.optional(),
    variantId: objectIdSchema.optional(),
    warehouseId: objectIdSchema.optional(),
    lowStock: z
        .enum(["true", "false"])
        .transform((v) => v === "true")
        .optional(),
});
