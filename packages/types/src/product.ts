import { SeoMetadata } from "./seo.js";
import { AuditActor } from "./audit.js";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface VariantPriceInput {
    currency: string;
    amount: number;
    compareAtAmount?: number;
    costAmount?: number;
    countryCode?: string;       // e.g. "IN", "US", "AE"
    countryName?: string;       // e.g. "India", "United States", "United Arab Emirates"
    locationCode?: string;      // e.g. "in", "us", "ae", "bangalore"
    locationName?: string;      // e.g. "India", "United States", "Bangalore"
}

export interface VariantPriceResponse {
    currency: string;
    amount: number;
    compareAtAmount?: number;
    countryCode?: string;
    countryName?: string;
    locationCode?: string;
    locationName?: string;
}

export interface AdminVariantPriceResponse extends VariantPriceResponse {
    costAmount?: number;
}

/**
 * Helper to select the best matching variant price for a user's location on frontend
 */
export function getPriceForLocation<T extends VariantPriceResponse | VariantPriceInput>(
    prices: T[],
    userContext?: { countryCode?: string; locationCode?: string; currency?: string }
): T | undefined {
    if (!prices || prices.length === 0) return undefined;
    if (!userContext) return prices[0];

    // 1. Exact country code match (e.g. "US", "AE", "IN")
    if (userContext.countryCode) {
        const countryMatch = prices.find(
            (p) => p.countryCode?.toUpperCase() === userContext.countryCode?.toUpperCase()
        );
        if (countryMatch) return countryMatch;
    }

    // 2. Location / City code match (e.g. "bangalore", "mumbai")
    if (userContext.locationCode) {
        const locMatch = prices.find(
            (p) => p.locationCode?.toLowerCase() === userContext.locationCode?.toLowerCase()
        );
        if (locMatch) return locMatch;
    }

    // 3. Currency code match (e.g. "USD", "AED", "INR")
    if (userContext.currency) {
        const currMatch = prices.find(
            (p) => p.currency?.toUpperCase() === userContext.currency?.toUpperCase()
        );
        if (currMatch) return currMatch;
    }

    // Fallback to primary base price
    return prices[0];
}

export type WeightUnit = "g" | "kg" | "ml" | "l" | "pcs" | "oz" | "lb" | string;

export interface ProductVariantInput {
    id?: string;
    sku: string;
    title: string;
    prices: VariantPriceInput[];
    barcode?: string;
    weight?: number;
    weightUnit?: WeightUnit;
    initialStock?: number; // Starting onHand inventory count
    attributes?: Record<string, unknown>;
    isActive?: boolean;
}

export interface ProductVariantResponse {
    id: string;
    sku: string;
    title: string;
    prices: VariantPriceResponse[];
    barcode?: string;
    weight?: number;
    weightUnit?: WeightUnit;
    attributes?: Record<string, unknown>;
    isActive: boolean;
}

export interface AdminProductVariantResponse {
    id: string;
    sku: string;
    title: string;
    prices: AdminVariantPriceResponse[];
    barcode?: string;
    weight?: number;
    weightUnit?: WeightUnit;
    initialStock?: number;
    attributes?: Record<string, unknown>;
    isActive: boolean;
}

export interface CustomNutrient {
    id?: string;
    name: string;
    amount: string | number;
    unit?: string;
}

export interface ProductNutritionInfo {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
    servingSize?: string;
    customNutrients?: CustomNutrient[];
    additional?: Record<string, string | number>;
}

export interface ProductResponse {
    id: string;
    title: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    brand?: string;
    categoryId: string;
    baseCurrency: string;
    variants: ProductVariantResponse[];
    images: string[];
    thumbnail?: string;
    tags: string[];
    status: ProductStatus;
    serviceableLocations?: string[];
    nutritionInfo?: ProductNutritionInfo;
    allergens?: string[];
    storageInstructions?: string;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
    averageRating: number;
    reviewCount: number;
    version: number;
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
    createdAt: string;
    updatedAt: string;
}

export interface AdminProductResponse extends Omit<ProductResponse, "variants"> {
    variants: AdminProductVariantResponse[];
}

export interface CreateProductInput {
    title: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    brand?: string;
    categoryId: string;
    baseCurrency?: string;
    variants: ProductVariantInput[];
    images?: string[];
    thumbnail?: string;
    tags?: string[];
    status?: ProductStatus;
    serviceableLocations?: string[];
    nutritionInfo?: ProductNutritionInfo;
    allergens?: string[];
    storageInstructions?: string;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
}

export interface UpdateProductInput {
    title?: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    brand?: string;
    categoryId?: string;
    baseCurrency?: string;
    variants?: ProductVariantInput[];
    images?: string[];
    thumbnail?: string;
    tags?: string[];
    status?: ProductStatus;
    serviceableLocations?: string[];
    nutritionInfo?: ProductNutritionInfo;
    allergens?: string[];
    storageInstructions?: string;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
    expectedVersion?: number;
}

export interface ProductQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    status?: ProductStatus;
    brand?: string;
    currency?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "createdAt" | "title" | "price";
    sortOrder?: "asc" | "desc";
}

export type Product = ProductResponse;
export type ProductVariant = ProductVariantResponse;

