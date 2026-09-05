import { z } from "zod";
import { objectIdSchema } from "./inventory.validation.js";

export const adjustInventorySchema = z.object({
    inventoryId: objectIdSchema,
    delta: z
        .number()
        .int()
        .refine((n) => n !== 0, {
            message: "Delta must be a non-zero integer",
        }),
    reason: z.string().min(3, "Reason must be at least 3 characters").trim(),
    referenceType: z
        .enum(["CHECKOUT", "ORDER", "MANUAL_ADJUSTMENT", "PURCHASE_ORDER", "EXPIRATION_WORKER"])
        .optional(),
    referenceId: z.string().trim().optional(),
});

export const movementsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    inventoryId: objectIdSchema.optional(),
    productId: objectIdSchema.optional(),
    variantId: objectIdSchema.optional(),
    type: z
        .enum([
            "INVENTORY_ADJUSTMENT",
            "RESERVATION_HOLD",
            "RESERVATION_RELEASE",
            "RESERVATION_COMMIT",
            "STOCK_RECEIPT",
            "DAMAGE_WRITE_OFF",
            "RETURN_RESTOCK",
        ])
        .optional(),
    referenceId: z.string().optional(),
});
