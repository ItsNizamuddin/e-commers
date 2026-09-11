import { z } from "zod";
import { locationSeoSchema, contentSectionSchema } from "../../validation/seo.validation.js";

export const upsertEntitySeoSchema = z.object({
    entityTitle: z.string().trim().optional(),
    entitySlug: z.string().trim().optional(),
    global: z
        .object({
            metaTitle: z.string().max(150).trim().optional(),
            metaDescription: z.string().max(300).trim().optional(),
            metaRobots: z.string().trim().optional(),
            keywords: z.array(z.string().trim()).optional(),
            canonicalUrl: z.string().or(z.literal("")).optional(),
            ogTitle: z.string().max(150).trim().optional(),
            ogDescription: z.string().max(300).trim().optional(),
            ogImage: z.string().optional(),
            internalSection: contentSectionSchema.optional(),
            bottomSection: contentSectionSchema.optional(),
        })
        .optional()
        .default({}),
    locations: z.array(locationSeoSchema).optional().default([]),
});

export const bulkSeoImportSchema = z.object({
    csvContent: z.string().min(5, "CSV content cannot be empty"),
    mode: z.enum(["UPSERT", "REPLACE"]).default("UPSERT"),
    autoFillMissingLocations: z.boolean().optional().default(false),
});

export const autoFillLocationsSchema = z.object({
    entityType: z.enum(["PRODUCT", "CATEGORY", "BRAND", "COLLECTION", "PAGE", "COURSE"]),
    entityId: z.string().min(1, "entityId is required"),
    titleTemplate: z.string().optional(),
    descTemplate: z.string().optional(),
    badgeTemplate: z.string().optional(),
});
