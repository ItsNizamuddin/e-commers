import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
    .string()
    .regex(objectIdRegex, "Invalid ObjectId format");

export const orderParamsSchema = z.object({
    id: objectIdSchema,
});

export const orderListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    orderStatus: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
    paymentStatus: z
        .enum([
            "PENDING",
            "AUTHORIZED",
            "CAPTURED",
            "FAILED",
            "REFUND_REQUESTED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
        ])
        .optional(),
    fulfillmentStatus: z
        .enum(["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED", "RETURNED"])
        .optional(),
    customerId: objectIdSchema.optional(),
    search: z.string().optional(),
});

export const updateFulfillmentSchema = z.object({
    fulfillmentStatus: z.enum([
        "UNFULFILLED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "RETURNED",
    ]),
    carrier: z.string().optional(),
    trackingNumber: z.string().optional(),
    expectedVersion: z.number().int().min(1, "expectedVersion must be a positive integer"),
});

export const cancelOrderSchema = z.object({
    reason: z.string().optional(),
    expectedVersion: z.number().int().min(1).optional(),
}).default({});

const stationIdSchema = z
    .string()
    .trim()
    .max(50, "Station ID must be 50 characters or less")
    .regex(/^[a-zA-Z0-9_-]+$/, "Station ID must contain only alphanumeric characters, dashes, or underscores")
    .optional();

export const startPackingSchema = z.object({
    stationId: stationIdSchema,
}).default({});

export const packingScanSchema = z.object({
    barcode: z.string().trim().min(1, "Barcode is required").max(255, "Barcode cannot exceed 255 characters"),
    stationId: stationIdSchema,
});

export const resetPackingSchema = z.object({
    reason: z.string().trim().min(1, "Reset reason is required").max(500, "Reset reason cannot exceed 500 characters"),
    stationId: stationIdSchema,
});

export const shipOrderSchema = z.object({
    expectedVersion: z.number().int().min(1, "expectedVersion must be a positive integer"),
    carrier: z.string().trim().max(100).optional(),
    trackingNumber: z.string().trim().max(100).optional(),
    stationId: stationIdSchema,
});

