import mongoose, { Schema, model, Model, Document } from "mongoose";
import { LotQualityStatus } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface FinishedGoodsLotDocument extends Document {
    lotNumber: string;
    packagingRunId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    variantId: mongoose.Types.ObjectId;
    warehouseId: mongoose.Types.ObjectId;
    warehouseName?: string | undefined;
    lotQuantity: number;
    allocatedQuantity: number;
    consumedQuantity: number;
    availableQuantity: number;
    expiryDate: Date;
    qualityStatus: LotQualityStatus;
    publicVerificationToken: string;
    packedAt: Date;
    recalledAt?: Date | undefined;
    recallReason?: string | undefined;
    recalledBy?: any | undefined;
    createdAt: Date;
    updatedAt: Date;
}

const FinishedGoodsLotSchema = new Schema<FinishedGoodsLotDocument>(
    {
        lotNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        packagingRunId: {
            type: Schema.Types.ObjectId,
            ref: "RepackagingRun",
            required: true,
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
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Warehouse",
            required: true,
            index: true,
        },
        warehouseName: {
            type: String,
            required: false,
        },
        lotQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        allocatedQuantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        consumedQuantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        availableQuantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            index: true,
        },
        expiryDate: {
            type: Date,
            required: true,
            index: true,
        },
        qualityStatus: {
            type: String,
            enum: ["AVAILABLE", "QUARANTINED", "REJECTED", "RECALLED"],
            default: "AVAILABLE",
            required: true,
            index: true,
        },
        publicVerificationToken: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        packedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        recalledAt: {
            type: Date,
            required: false,
        },
        recallReason: {
            type: String,
            required: false,
        },
        recalledBy: {
            type: AuditActorSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

// High-performance compound index for sub-millisecond FEFO lookups
FinishedGoodsLotSchema.index({
    warehouseId: 1,
    variantId: 1,
    qualityStatus: 1,
    availableQuantity: 1,
    expiryDate: 1,
});

export const FinishedGoodsLotModel: Model<FinishedGoodsLotDocument> =
    (mongoose.models.FinishedGoodsLot as Model<FinishedGoodsLotDocument>) ||
    model<FinishedGoodsLotDocument>("FinishedGoodsLot", FinishedGoodsLotSchema);
