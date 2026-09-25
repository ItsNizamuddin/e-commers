import { z } from "zod";

export const updateWalletConfigSchema = z
    .object({
        signupBonusEnabled: z.boolean().optional(),
        signupBonusByCurrency: z
            .record(z.string().min(3).max(3), z.number().int().min(0, "Bonus amount cannot be negative"))
            .optional(),
        defaultCurrency: z.string().trim().length(3).toUpperCase().optional(),
        countryToCurrency: z
            .record(z.string().min(2).max(2), z.string().min(3).max(3))
            .optional(),
    })
    .strict();

export type UpdateWalletConfigBody = z.infer<typeof updateWalletConfigSchema>;

export const adminWalletAdjustSchema = z
    .object({
        userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer user ID"),
        type: z.enum(["CREDIT", "DEBIT"]),
        amountMinor: z.number().int().positive("Amount must be a positive integer in minor units (paise/cents)"),
        reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(255),
        idempotencyKey: z.string().trim().min(5).max(100).optional(),
    })
    .strict();

export type AdminWalletAdjustBody = z.infer<typeof adminWalletAdjustSchema>;

export const customerIdParamSchema = z
    .object({
        userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid customer user ID"),
    })
    .strict();

export type CustomerIdParam = z.infer<typeof customerIdParamSchema>;
