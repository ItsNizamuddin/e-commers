import { z } from "zod";

export const topUpIntentSchema = z
    .object({
        amountMinor: z
            .number()
            .int("Amount must be an integer (in paise)")
            .min(1000, "Minimum top-up is ₹10.00 (1000 paise)")
            .max(5000000, "Maximum top-up is ₹50,000.00 (5000000 paise)"),
        provider: z.enum(["STRIPE", "RAZORPAY", "MOCK"]).default("MOCK"),
    })
    .strict();

export type TopUpIntentInput = z.infer<typeof topUpIntentSchema>;

export const adminAdjustWalletSchema = z
    .object({
        amountMinor: z
            .number()
            .int("Amount must be an integer (in paise)")
            .positive("Amount must be positive"),
        reason: z
            .string()
            .trim()
            .min(5, "Reason must be at least 5 characters"),
    })
    .strict();

export type AdminAdjustWalletInput = z.infer<typeof adminAdjustWalletSchema>;

export const adminUpdateWalletStatusSchema = z
    .object({
        status: z.enum(["ACTIVE", "FROZEN", "SUSPENDED"]),
        reason: z
            .string()
            .trim()
            .min(5, "Reason must be at least 5 characters"),
    })
    .strict();

export type AdminUpdateWalletStatusInput = z.infer<typeof adminUpdateWalletStatusSchema>;
