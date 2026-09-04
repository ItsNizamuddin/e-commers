import { z } from "zod";

export const contentSectionSchema = z.object({
    title: z.string().trim().optional(),
    value: z.string().optional(),
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
});
