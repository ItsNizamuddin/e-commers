import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface ProductionRunDocument extends Document {
    batchNumber: string;
    recipeId: mongoose.Types.ObjectId;
    recipeCode: string;
    recipeName: string;
    recipeVersion: number;
    productId?: mongoose.Types.ObjectId;
    productTitle?: string;
    variantId?: mongoose.Types.ObjectId;
    variantTitle?: string;
    bulkLotId?: mongoose.Types.ObjectId;
    bulkLotNumber?: string;
    isBulkProduction?: boolean;
    warehouseId: mongoose.Types.ObjectId;
    plannedQuantity: number;
    actualQuantity: number;
    yieldUnit: string;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "PARTIALLY_REVERSED" | "REVERSED";
    manufacturingDate: Date;
    expiryDate: Date;
    expiryDetermination?: {
        recipeShelfLifeDays?: number | undefined;
        recipeTheoreticalExpiryDate?: string | undefined;
        shortestIngredientExpiryDate?: string | undefined;
        shortestIngredientName?: string | undefined;
        systemRecommendedExpiryDate: string;
        finalExpiryDate: string;
        decisionType: "ACCEPTED_SYSTEM_RECOMMENDATION" | "QA_OVERRIDE" | "MANUAL_SPECIFICATION";
        qaApprovalNotes?: string | undefined;
    } | undefined;
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
    wastageReport?: {
        expectedLossQuantity: number;
        actualLossQuantity: number;
        varianceQuantity: number;
        unit: RawMaterialUnit;
        wastageCategory: string;
        wastageNotes?: string | undefined;
    } | undefined;
    reversedQuantity?: number | undefined;
    reversalDetails?: {
        reversedAt: Date;
        reversalReference: string;
        reason: string;
        reversedBy?: any;
        reversedQuantity: number;
        originalQuantity: number;
        soldOrReservedAtReversal: number;
        isPartial: boolean;
    } | undefined;
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
        reversedQuantity: { type: Number, required: true, default: 0 },
        originalQuantity: { type: Number, required: true, default: 0 },
        soldOrReservedAtReversal: { type: Number, required: true, default: 0 },
        isPartial: { type: Boolean, required: true, default: false },
    },
    { _id: false }
);

const WastageReportSubSchema = new Schema(
    {
        expectedLossQuantity: { type: Number, required: true, default: 0 },
        actualLossQuantity: { type: Number, required: true, default: 0 },
        varianceQuantity: { type: Number, required: true, default: 0 },
        unit: { type: String, required: true },
        wastageCategory: {
            type: String,
            enum: [
                "RECIPE_NORMAL_LOSS",
                "PRODUCTION_UNPLANNED_LOSS",
                "SPOILAGE_QC_FAILURE",
                "DAMAGE_HANDLING",
            ],
            default: "RECIPE_NORMAL_LOSS",
        },
        wastageNotes: { type: String, trim: true },
    },
    { _id: false }
);

const ExpiryDeterminationSubSchema = new Schema(
    {
        recipeShelfLifeDays: { type: Number },
        recipeTheoreticalExpiryDate: { type: String },
        shortestIngredientExpiryDate: { type: String },
        shortestIngredientName: { type: String },
        systemRecommendedExpiryDate: { type: String, required: true },
        finalExpiryDate: { type: String, required: true },
        decisionType: {
            type: String,
            enum: ["ACCEPTED_SYSTEM_RECOMMENDATION", "QA_OVERRIDE", "MANUAL_SPECIFICATION"],
            default: "ACCEPTED_SYSTEM_RECOMMENDATION",
        },
        qaApprovalNotes: { type: String, trim: true },
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
            required: false,
            default: undefined,
            index: true,
        },
        productTitle: {
            type: String,
            required: false,
            default: undefined,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            default: undefined,
        },
        variantTitle: {
            type: String,
            default: undefined,
        },
        bulkLotId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterialLot",
            default: undefined,
            index: true,
        },
        bulkLotNumber: {
            type: String,
            uppercase: true,
            trim: true,
            default: undefined,
        },
        isBulkProduction: {
            type: Boolean,
            default: false,
            index: true,
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
            enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "PARTIALLY_REVERSED", "REVERSED"],
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
        expiryDetermination: {
            type: ExpiryDeterminationSubSchema,
            default: undefined,
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
        wastageReport: {
            type: WastageReportSubSchema,
            default: undefined,
        },
        reversedQuantity: {
            type: Number,
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
