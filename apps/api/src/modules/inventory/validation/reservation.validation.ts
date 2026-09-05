import { z } from "zod";
import { objectIdSchema } from "./inventory.validation.js";

export const reservationIdParamSchema = z.object({
    id: z.string().min(1, "Reservation identifier is required"),
});

export const createReservationItemSchema = z.object({
    variantId: objectIdSchema,
    warehouseId: objectIdSchema.optional(),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createReservationSchema = z.object({
    checkoutId: z.string().min(1, "checkoutId is required").trim(),
    idempotencyKey: z.string().trim().optional(),
    ttlMinutes: z.number().int().min(1).max(1440).optional(),
    items: z
        .array(createReservationItemSchema)
        .min(1, "Reservation must include at least one item"),
});
