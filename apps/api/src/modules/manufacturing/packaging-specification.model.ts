import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit } from "@ecommers/types";

export interface PackagingSpecificationDocument extends Document {
    name: string;
    code: string;
    masterFormulaId?: mongoose.Types.ObjectId | undefined;
    productId: mongoose.Types.ObjectId;
    variantId: mongoose.Types.ObjectId;
    bulkConsumedPerUnit: number;
    bulkUnit: RawMaterialUnit;
    packagingMaterials: Array<{
        rawMaterialId: mongoose.Types.ObjectId;
        quantity: number;
        unit: RawMaterialUnit;
    }>;
    laborOverheadCost: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const PackagingItemSubSchema = new Schema(
    {
        rawMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
    },
    { _id: false }
);

const PackagingSpecificationSchema = new Schema<PackagingSpecificationDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        masterFormulaId: {
            type: Schema.Types.ObjectId,
            ref: "Recipe",
            default: undefined,
            index: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        bulkConsumedPerUnit: {
            type: Number,
            required: true,
            min: 0.0001,
        },
        bulkUnit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
        packagingMaterials: [PackagingItemSubSchema],
        laborOverheadCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
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

PackagingSpecificationSchema.index({ productId: 1, variantId: 1 });

export const PackagingSpecificationModel =
    (mongoose.models.PackagingSpecification as Model<PackagingSpecificationDocument>) ||
    model<PackagingSpecificationDocument>("PackagingSpecification", PackagingSpecificationSchema);
