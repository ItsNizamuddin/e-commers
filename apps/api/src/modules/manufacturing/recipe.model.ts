import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit } from "@ecommers/types";

export interface RecipeDocument extends Document {
    code: string;
    name: string;
    version: number;
    status: "ACTIVE" | "ARCHIVED" | "DRAFT";
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    shelfLifeDays: number;
    batchYield: {
        quantity: number;
        unit: string;
    };
    ingredients: Array<{
        rawMaterialId: mongoose.Types.ObjectId;
        quantity: number;
        unit: RawMaterialUnit;
        wastagePercent: number;
    }>;
    packagingMaterials: Array<{
        rawMaterialId: mongoose.Types.ObjectId;
        quantity: number;
        unit: RawMaterialUnit;
    }>;
    laborOverheadCost: number;
    instructions?: string;
    estimatedCostWac: number;
    estimatedCostHighest: number;
    changeLog?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RecipeIngredientSubSchema = new Schema(
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
        wastagePercent: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const RecipePackagingSubSchema = new Schema(
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

const RecipeSchema = new Schema<RecipeDocument>(
    {
        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        version: {
            type: Number,
            required: true,
            default: 1,
            index: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "ARCHIVED", "DRAFT"],
            required: true,
            default: "ACTIVE",
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
            default: undefined,
        },
        shelfLifeDays: {
            type: Number,
            required: true,
            default: 30,
            min: 1,
        },
        batchYield: {
            quantity: { type: Number, required: true, min: 0.001 },
            unit: { type: String, required: true, trim: true },
        },
        ingredients: [RecipeIngredientSubSchema],
        packagingMaterials: [RecipePackagingSubSchema],
        laborOverheadCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        instructions: {
            type: String,
            trim: true,
        },
        estimatedCostWac: {
            type: Number,
            default: 0,
            min: 0,
        },
        estimatedCostHighest: {
            type: Number,
            default: 0,
            min: 0,
        },
        changeLog: {
            type: String,
            trim: true,
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

RecipeSchema.index({ code: 1, version: 1 }, { unique: true });
RecipeSchema.index({ productId: 1, status: 1 });

export const RecipeModel =
    (mongoose.models.Recipe as Model<RecipeDocument>) ||
    model<RecipeDocument>("Recipe", RecipeSchema);
