import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface RepackagingRunDocument extends Document {
    runNumber: string;
    sourceRawMaterialId: mongoose.Types.ObjectId;
    sourceRawMaterialName: string;
    sourceLotId: mongoose.Types.ObjectId;
    sourceLotNumber: string;
    sourceQuantity: number;
    sourceUnit: RawMaterialUnit;
    targetProductId: mongoose.Types.ObjectId;
    targetProductTitle: string;
    targetVariantId: mongoose.Types.ObjectId;
    targetVariantTitle: string;
    packageUnitsProduced: number;
    unitSizeQuantity: number;
    unitSizeUnit: RawMaterialUnit;
    packagingMaterialId?: mongoose.Types.ObjectId | undefined;
    packagingMaterialName?: string | undefined;
    packagingMaterialQuantity?: number | undefined;
    wastageQuantity?: number | undefined;
    warehouseId: mongoose.Types.ObjectId;
    warehouseName?: string | undefined;
    totalCost: number;
    unitCost: number;
    status: "COMPLETED" | "REVERSED";
    expiryDate: Date;
    reversalDetails?: {
        reversedAt: Date;
        reversalReference: string;
        reason: string;
        reversedBy?: any;
    } | undefined;
    notes?: string | undefined;
    createdAt: Date;
    updatedAt: Date;
}

const ReversalDetailsSubSchema = new Schema(
    {
        reversedAt: { type: Date, required: true },
        reversalReference: { type: String, required: true },
        reason: { type: String, required: true },
        reversedBy: { type: AuditActorSchema, default: undefined },
    },
    { _id: false }
);

const RepackagingRunSchema = new Schema<RepackagingRunDocument>(
    {
        runNumber: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        sourceRawMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            required: true,
            index: true,
        },
        sourceRawMaterialName: {
            type: String,
            required: true,
        },
        sourceLotId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterialLot",
            required: true,
            index: true,
        },
        sourceLotNumber: {
            type: String,
            required: true,
            uppercase: true,
        },
        sourceQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        sourceUnit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
        targetProductId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        targetProductTitle: {
            type: String,
            required: true,
        },
        targetVariantId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        targetVariantTitle: {
            type: String,
            required: true,
        },
        packageUnitsProduced: {
            type: Number,
            required: true,
            min: 1,
        },
        unitSizeQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        unitSizeUnit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
        packagingMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            default: undefined,
        },
        packagingMaterialName: {
            type: String,
            default: undefined,
        },
        packagingMaterialQuantity: {
            type: Number,
            default: undefined,
        },
        wastageQuantity: {
            type: Number,
            default: 0,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Location",
            required: true,
            index: true,
        },
        warehouseName: {
            type: String,
            default: undefined,
        },
        totalCost: {
            type: Number,
            required: true,
            min: 0,
        },
        unitCost: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["COMPLETED", "REVERSED"],
            required: true,
            default: "COMPLETED",
            index: true,
        },
        expiryDate: {
            type: Date,
            required: true,
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

RepackagingRunSchema.index({ createdAt: -1 });

export const RepackagingRunModel =
    (mongoose.models.RepackagingRun as Model<RepackagingRunDocument>) ||
    model<RepackagingRunDocument>("RepackagingRun", RepackagingRunSchema);
