import { z } from "zod";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
    .string()
    .regex(objectIdRegex, "Invalid ObjectId format");

export const addressSchema = z.object({
    firstName: z.string().min(1, "First name is required").trim(),
    lastName: z.string().min(1, "Last name is required").trim(),
    street: z.string().min(1, "Street address is required").trim(),
    city: z.string().min(1, "City is required").trim(),
    state: z.string().min(1, "State is required").trim(),
    postalCode: z.string().min(1, "Postal code is required").trim(),
    country: z.string().length(2, "Country must be a 2-letter ISO code").toUpperCase().trim(),
    phone: z.string().optional(),
});

export const initCheckoutSchema = z
    .object({
        email: z.string().email("Invalid email format").optional(),
        shippingAddress: addressSchema.optional(),
        billingAddress: addressSchema.optional(),
        promoCode: z.string().optional(),
    })
    .default({});

export const updateCheckoutAddressesSchema = z.object({
    shippingAddress: addressSchema.optional(),
    billingAddress: addressSchema.optional(),
    expectedVersion: z.number().int().min(1, "expectedVersion is required and must be a positive integer"),
});

export const cancelCheckoutSchema = z
    .object({
        expectedVersion: z.number().int().min(1).optional(),
    })
    .default({});

export const paymentWebhookSchema = z.object({
    event: z.enum(["payment.succeeded", "payment.failed"]),
    checkoutId: objectIdSchema,
    paymentIntentId: z.string().optional(),
    reason: z.string().optional(),
});
