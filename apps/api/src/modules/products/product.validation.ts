import { z } from "zod";
import { seoMetadataSchema } from "../../validation/seo.validation.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const variantPriceSchema = z
    .object({
        currency: z
            .string()
            .length(3, "Currency must be a 3-letter ISO code")
            .transform((s) => s.toUpperCase()),
        amount: z.number().int().min(0, "Amount must be a non-negative integer"),
        compareAtAmount: z.number().int().min(0, "compareAtAmount must be non-negative").optional(),
        costAmount: z.number().int().min(0, "costAmount must be non-negative").optional(),
    })
    .refine(
        (data) => data.compareAtAmount === undefined || data.compareAtAmount >= data.amount,
        {
            message: "compareAtAmount cannot be less than sale amount",
            path: ["compareAtAmount"],
        }
    );

export const productVariantSchema = z
    .object({
        id: z.string().optional(),
        sku: z
            .string()
            .min(1, "SKU is required")
            .transform((s) => s.trim().toUpperCase()),
        title: z.string().min(1, "Variant title is required").trim(),
        prices: z
            .array(variantPriceSchema)
            .min(1, "Each variant must contain at least one price entry"),
        barcode: z.string().trim().optional(),
        weight: z.number().min(0, "Weight must be non-negative").optional(),
        weightUnit: z.string().trim().optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        isActive: z.boolean().optional(),
    })
    .refine(
        (variant) => {
            const currencies = variant.prices.map((p) => p.currency);
            return new Set(currencies).size === currencies.length;
        },
        {
            message: "Duplicate currency detected within the same variant",
            path: ["prices"],
        }
    );

export const nutritionInfoSchema = z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbohydrates: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
    fiber: z.number().min(0).optional(),
    sodium: z.number().min(0).optional(),
    servingSize: z.string().trim().optional(),
});

export const createProductSchema = z
    .object({
        title: z.string().min(1, "Title is required").max(200).trim(),
        slug: z
            .string()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
            .optional(),
        description: z.string().trim().optional(),
        shortDescription: z.string().trim().optional(),
        brand: z.string().trim().optional(),
        categoryId: z.string().regex(objectIdRegex, "Invalid categoryId format"),
        baseCurrency: z
            .string()
            .length(3, "baseCurrency must be a 3-letter ISO code")
            .default("USD")
            .transform((s) => s.toUpperCase()),
        variants: z
            .array(productVariantSchema)
            .min(1, "A product must have at least one variant"),
        images: z.array(z.string()).optional(),
        thumbnail: z.string().optional(),
        tags: z.array(z.string().trim()).optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        nutritionInfo: nutritionInfoSchema.optional(),
        allergens: z.array(z.string().trim()).optional(),
        storageInstructions: z.string().trim().optional(),
        seo: seoMetadataSchema.optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .superRefine((data, ctx) => {
        const seen = new Set<string>();
        for (let i = 0; i < data.variants.length; i++) {
            const variant = data.variants[i];
            if (!variant) continue;
            const sku = variant.sku;
            if (seen.has(sku)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate SKU '${sku}' found within variants`,
                    path: ["variants", i, "sku"],
                });
            }
            seen.add(sku);

            const hasBaseCurrencyPrice = variant.prices.some((p) => p.currency === data.baseCurrency);
            if (!hasBaseCurrencyPrice) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Variant '${variant.title || i}' is missing a price in the product baseCurrency '${data.baseCurrency}'`,
                    path: ["variants", i, "prices"],
                });
            }
        }
    });

export const updateProductSchema = z
    .object({
        title: z.string().min(1).max(200).trim().optional(),
        slug: z
            .string()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
            .optional(),
        description: z.string().trim().optional(),
        shortDescription: z.string().trim().optional(),
        brand: z.string().trim().optional(),
        categoryId: z.string().regex(objectIdRegex, "Invalid categoryId format").optional(),
        baseCurrency: z
            .string()
            .length(3)
            .transform((s) => s.toUpperCase())
            .optional(),
        variants: z.array(productVariantSchema).min(1).optional(),
        images: z.array(z.string()).optional(),
        thumbnail: z.string().optional(),
        tags: z.array(z.string().trim()).optional(),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
        nutritionInfo: nutritionInfoSchema.optional(),
        allergens: z.array(z.string().trim()).optional(),
        storageInstructions: z.string().trim().optional(),
        seo: seoMetadataSchema.optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        expectedVersion: z.number().int().positive().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.variants) {
            const seen = new Set<string>();
            for (let i = 0; i < data.variants.length; i++) {
                const variant = data.variants[i];
                if (!variant) continue;
                const sku = variant.sku;
                if (seen.has(sku)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Duplicate SKU '${sku}' found within variants`,
                        path: ["variants", i, "sku"],
                    });
                }
                seen.add(sku);
            }
        }
    });

export const productQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    categoryId: z.string().regex(objectIdRegex).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    brand: z.string().trim().optional(),
    currency: z
        .string()
        .length(3)
        .transform((s) => s.toUpperCase())
        .optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    sortBy: z.enum(["createdAt", "title", "price"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});
