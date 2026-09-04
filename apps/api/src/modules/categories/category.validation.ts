import { z } from "zod";
import { seoMetadataSchema } from "../../validation/seo.validation.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const categorySEOSchema = seoMetadataSchema;

export const createCategorySchema = z.object({
    name: z
        .string()
        .min(1, "Category name is required")
        .max(100, "Category name cannot exceed 100 characters")
        .trim(),
    slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens")
        .optional(),
    description: z.string().max(1000, "Description cannot exceed 1000 characters").trim().optional(),
    parentId: z
        .string()
        .regex(objectIdRegex, "Invalid parentId format")
        .nullable()
        .optional(),
    image: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0, "sortOrder must be a non-negative integer").optional(),
    seo: seoMetadataSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    isActive: z.coerce.boolean().optional(),
    parentId: z.string().nullable().optional(),
    tree: z.coerce.boolean().optional(),
});
