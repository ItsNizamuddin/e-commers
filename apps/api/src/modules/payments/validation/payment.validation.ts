import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
    .string()
    .regex(objectIdRegex, "Invalid ObjectId format");

export const createPaymentIntentSchema = z.object({
    checkoutId: objectIdSchema,
    provider: z.enum(["STRIPE", "RAZORPAY", "MOCK"]).optional().default("MOCK"),
});

export const paymentParamsSchema = z.object({
    id: objectIdSchema,
});
