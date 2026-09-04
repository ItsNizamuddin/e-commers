import { Types } from "mongoose";
import {
    ProductStatus,
    ProductVariantInput,
    ProductNutritionInfo,
    SeoMetadata,
    AuditActor,
} from "@shopsphere/types";

export * from "@shopsphere/types";

export interface IProduct {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    brand?: string;
    categoryId: Types.ObjectId;
    baseCurrency: string;
    variants: ProductVariantInput[];
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
    createdAt: Date;
    updatedAt: Date;
}
