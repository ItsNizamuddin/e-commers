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
