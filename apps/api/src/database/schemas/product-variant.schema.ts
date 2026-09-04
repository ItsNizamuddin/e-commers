import { Schema, Types } from "mongoose";
import { ProductVariantInput } from "@shopsphere/types";
import { VariantPriceSchema } from "./variant-price.schema.js";

export const ProductVariantSchema = new Schema<ProductVariantInput>(
    {
        id: {
            type: String,
            default: () => new Types.ObjectId().toString(),
        },
        sku: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        prices: {
            type: [VariantPriceSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
                message: "A variant must contain at least one price entry",
            },
        },
        barcode: {
            type: String,
            trim: true,
            default: undefined,
        },
        weight: {
            type: Number,
            min: 0,
            default: undefined,
        },
        weightUnit: {
            type: String,
            trim: true,
            default: undefined,
        },
        attributes: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);
