import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface ProductionRunDocument extends Document {
    batchNumber: string;
    recipeId: mongoose.Types.ObjectId;
    recipeCode: string;
    recipeName: string;
    recipeVersion: number;
    productId: mongoose.Types.ObjectId;
    productTitle: string;
    variantId?: mongoose.Types.ObjectId;
    variantTitle?: string;
    warehouseId: mongoose.Types.ObjectId;
    plannedQuantity: number;
    actualQuantity: number;
    yieldUnit: string;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "REVERSED";
    manufacturingDate: Date;
    expiryDate: Date;
    lotsConsumed: Array<{
        rawMaterialId: mongoose.Types.ObjectId;
        rawMaterialName: string;
        lotId: mongoose.Types.ObjectId;
        lotNumber: string;
        quantity: number;
        unit: RawMaterialUnit;
        costPerUnit: number;
        expiryDate: Date;
    }>;
    actualTotalCost: number;
    actualUnitCost: number;
    estimatedUnitCost: number;
    costVariance: number;
    reversalDetails?: {
        reversedAt: Date;
        reversalReference: string;
        reason: string;
        reversedBy?: any;
    };
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LotConsumptionSubSchema = new Schema(
    {
        rawMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            required: true,
        },
        rawMaterialName: {
            type: String,
            required: true,
        },
        lotId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterialLot",
            required: true,
        },
        lotNumber: {
            type: String,
            required: true,
            uppercase: true,
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
        costPerUnit: {
            type: Number,
            required: true,
            min: 0,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
    },
    { _id: false }
);

const ReversalDetailsSubSchema = new Schema(
    {
        reversedAt: { type: Date, required: true },
        reversalReference: { type: String, required: true },
        reason: { type: String, required: true },
        reversedBy: { type: AuditActorSchema, default: undefined },
    },
    { _id: false }
);

const ProductionRunSchema = new Schema<ProductionRunDocument>(
    {
        batchNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        recipeId: {
            type: Schema.Types.ObjectId,
            ref: "Recipe",
            required: true,
            index: true,
        },
        recipeCode: {
            type: String,
            required: true,
        },
        recipeName: {
            type: String,
            required: true,
        },
        recipeVersion: {
            type: Number,
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        productTitle: {
            type: String,
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            default: undefined,
        },
        variantTitle: {
            type: String,
            default: undefined,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Location",
            required: true,
            index: true,
        },
        plannedQuantity: {
            type: Number,
            required: true,
            min: 0.001,
        },
        actualQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        yieldUnit: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "REVERSED"],
            required: true,
            default: "COMPLETED",
            index: true,
        },
        manufacturingDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        lotsConsumed: [LotConsumptionSubSchema],
        actualTotalCost: {
            type: Number,
            required: true,
            min: 0,
        },
        actualUnitCost: {
            type: Number,
            required: true,
            min: 0,
        },
        estimatedUnitCost: {
            type: Number,
            required: true,
            min: 0,
        },
        costVariance: {
            type: Number,
            required: true,
            default: 0,
        },
        reversalDetails: {
            type: ReversalDetailsSubSchema,
            default: undefined,
        },
        notes: {
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

ProductionRunSchema.index({ manufacturingDate: -1 });

export const ProductionRunModel =
    (mongoose.models.ProductionRun as Model<ProductionRunDocument>) ||
    model<ProductionRunDocument>("ProductionRun", ProductionRunSchema);
