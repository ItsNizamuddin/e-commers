import { z } from "zod";

export const contentSectionSchema = z.object({
    title: z.string().trim().optional(),
    value: z.string().optional(),
});

export const locationSeoSchema = z.object({
    locationKey: z.string().min(1, "Location key is required").trim().toLowerCase(),
    locationType: z.enum(["CITY", "COUNTRY", "ZONE"]),
    locationName: z.string().min(1, "Location name is required").trim(),
    currency: z.string().trim().toUpperCase().optional(),
    metaTitle: z.string().max(150).trim().optional(),
    metaDescription: z.string().max(300).trim().optional(),
    keywords: z.array(z.string().trim()).optional(),
    deliveryHighlight: z.string().trim().optional(),
    canonicalUrl: z.string().or(z.literal("")).optional(),
    isIndexed: z.boolean().optional(),
    internalSection: contentSectionSchema.optional(),
    bottomSection: contentSectionSchema.optional(),
});

export const seoMetadataSchema = z.object({
    metaTitle: z.string().max(150, "metaTitle cannot exceed 150 characters").trim().optional(),
    metaDescription: z.string().max(300, "metaDescription cannot exceed 300 characters").trim().optional(),
    metaRobots: z.string().trim().optional(),
    keywords: z.array(z.string().trim()).optional(),
    canonicalUrl: z.string().or(z.literal("")).optional(),
    ogTitle: z.string().max(150).trim().optional(),
    ogDescription: z.string().max(300).trim().optional(),
    ogImage: z.string().optional(),
    ogType: z.string().optional(),
    twitterCard: z.string().optional(),
    twitterTitle: z.string().max(150).trim().optional(),
    twitterDescription: z.string().max(300).trim().optional(),
    twitterImage: z.string().optional(),
    internalSection: contentSectionSchema.optional(),
    bottomSection: contentSectionSchema.optional(),
    structuredData: z.record(z.string(), z.unknown()).optional(),
    locations: z.array(locationSeoSchema).optional(),
});

