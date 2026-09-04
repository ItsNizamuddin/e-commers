import { SeoMetadata } from "./seo.js";
import { AuditActor } from "./audit.js";

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface VariantPriceInput {
    currency: string;
    amount: number;
    compareAtAmount?: number;
    costAmount?: number;
}

export interface VariantPriceResponse {
    currency: string;
    amount: number;
    compareAtAmount?: number;
}

export interface AdminVariantPriceResponse extends VariantPriceResponse {
    costAmount?: number;
}

export interface ProductVariantInput {
    id?: string;
    sku: string;
    title: string;
    prices: VariantPriceInput[];
    barcode?: string;
    weight?: number;
    weightUnit?: string;
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
    weightUnit?: string;
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
    weightUnit?: string;
    attributes?: Record<string, unknown>;
    isActive: boolean;
}

export interface ProductNutritionInfo {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    servingSize?: string;
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
    nutritionInfo?: ProductNutritionInfo;
    allergens?: string[];
    storageInstructions?: string;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
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
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "createdAt" | "title" | "price";
    sortOrder?: "asc" | "desc";
}
