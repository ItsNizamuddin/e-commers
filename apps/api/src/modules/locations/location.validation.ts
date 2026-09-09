import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const locationSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createLocationSchema = z.object({
    code: z
        .string()
        .min(2, "Location code must be at least 2 characters")
        .max(50)
        .regex(locationSlugRegex, "Code must be a URL-safe lowercase slug (e.g. 'bangalore', 'us')")
        .transform((s) => s.toLowerCase().trim()),
    name: z.string().min(1, "Location name is required").max(100).trim(),
    type: z.enum(["CITY", "COUNTRY", "ZONE"]).default("CITY"),
    countryCode: z
        .string()
        .length(2, "Country code must be 2 uppercase letters (e.g. 'IN', 'US')")
        .transform((s) => s.toUpperCase().trim()),
    currency: z
        .string()
        .length(3, "Currency must be a 3-letter ISO code (e.g. 'INR', 'USD')")
        .transform((s) => s.toUpperCase().trim()),
    isActive: z.boolean().default(true),
    deliveryEstimate: z.string().min(1, "Delivery estimate is required").trim(),
    warehouseId: z.string().regex(objectIdRegex, "Invalid warehouse ID format").optional(),
    minOrderValue: z.number().min(0).optional(),
    shippingFlatRate: z.number().min(0).optional(),
    postalCodes: z.array(z.string().trim()).default([]),
    postalCodePrefixes: z.array(z.string().trim()).default([]),
    defaultSeoTitleTemplate: z.string().trim().optional(),
    defaultSeoDescriptionTemplate: z.string().trim().optional(),
    deliveryHighlight: z.string().trim().optional(),
    sortOrder: z.number().default(0),
});

export const updateLocationSchema = createLocationSchema.partial().omit({ code: true });

export const checkPincodeSchema = z.object({
    pincode: z
        .string()
        .min(3, "Pincode / Postal code must be at least 3 characters")
        .max(12)
        .trim(),
    countryCode: z.string().length(2).optional(),
});

export const locationQuerySchema = z.object({
    type: z.enum(["CITY", "COUNTRY", "ZONE"]).optional(),
    countryCode: z.string().optional(),
    isActive: z
        .string()
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
    search: z.string().optional(),
});
