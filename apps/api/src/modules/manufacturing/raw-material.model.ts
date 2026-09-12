import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit, RawMaterialCategory, RawMaterialUsage } from "@ecommers/types";

export interface RawMaterialDocument extends Document {
    code: string;
    name: string;
    category: RawMaterialCategory;
    usage: RawMaterialUsage;
    linkedProductId?: mongoose.Types.ObjectId | undefined;
    linkedVariantId?: mongoose.Types.ObjectId | undefined;
    unit: RawMaterialUnit;
    currentStock: number;
    reorderThreshold: number;
    averageCost: number;
    lastPurchasePrice: number;
    warehouseId?: mongoose.Types.ObjectId | undefined;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const RawMaterialSchema = new Schema<RawMaterialDocument>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        category: {
            type: String,
            enum: [
                "INGREDIENT",
                "DAIRY",
                "SWEETENER",
                "SPICE",
                "OIL",
                "GRAIN",
                "PACKAGING",
                "OTHER",
            ],
            required: true,
            index: true,
        },
        usage: {
            type: String,
            enum: ["RAW_MATERIAL", "SELLABLE", "BOTH"],
            required: true,
            default: "RAW_MATERIAL",
            index: true,
        },
        linkedProductId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            default: undefined,
            index: true,
        },
        linkedVariantId: {
            type: Schema.Types.ObjectId,
            default: undefined,
        },
        unit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
        currentStock: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        reorderThreshold: {
            type: Number,
            required: true,
            default: 5,
            min: 0,
        },
        averageCost: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        lastPurchasePrice: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Location",
            default: undefined,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                return ret;
            },
        },
    }
);

RawMaterialSchema.index({ category: 1, isActive: 1 });
RawMaterialSchema.index({ name: "text", code: "text" });

export const RawMaterialModel =
    (mongoose.models.RawMaterial as Model<RawMaterialDocument>) ||
    model<RawMaterialDocument>("RawMaterial", RawMaterialSchema);
