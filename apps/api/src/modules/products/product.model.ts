import { Schema, model, models, Model, Document } from "mongoose";
import { IProduct } from "./product.types.js";
import { SeoSchema } from "../../database/schemas/seo.schema.js";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";
import { ProductVariantSchema } from "../../database/schemas/product-variant.schema.js";

export interface ProductDocument extends Omit<IProduct, "_id">, Document {}

const NutritionSchema = new Schema(
    {
        calories: { type: Number, min: 0 },
        protein: { type: Number, min: 0 },
        carbohydrates: { type: Number, min: 0 },
        fat: { type: Number, min: 0 },
        fiber: { type: Number, min: 0 },
        sodium: { type: Number, min: 0 },
        servingSize: { type: String, trim: true },
    },
    { _id: false }
);

const ProductSchema = new Schema<ProductDocument>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
        },
        shortDescription: {
            type: String,
            trim: true,
        },
        brand: {
            type: String,
            trim: true,
            index: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            index: true,
        },
        baseCurrency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            default: "USD",
        },
        variants: {
            type: [ProductVariantSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
                message: "A product must have at least one variant",
            },
        },
        images: {
            type: [String],
            default: [],
        },
        thumbnail: {
            type: String,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
            default: "DRAFT",
            index: true,
        },
        nutritionInfo: {
            type: NutritionSchema,
            default: undefined,
        },
        allergens: {
            type: [String],
            default: undefined,
        },
        storageInstructions: {
            type: String,
            trim: true,
        },
        seo: {
            type: SeoSchema,
            default: undefined,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
        version: {
            type: Number,
            default: 1,
        },
        createdBy: {
            type: AuditActorSchema,
            default: undefined,
        },
        updatedBy: {
            type: AuditActorSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });
ProductSchema.index({ status: 1, "variants.prices.currency": 1, "variants.prices.amount": 1 });
ProductSchema.index({ title: "text", description: "text", brand: "text", tags: "text" });

export const ProductModel =
    (models.Product as Model<ProductDocument>) || model<ProductDocument>("Product", ProductSchema);
