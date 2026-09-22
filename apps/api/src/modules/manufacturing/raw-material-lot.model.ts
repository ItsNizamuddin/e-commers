import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit, RawMaterialSourceType, RawMaterialLotStatus } from "@ecommers/types";

export interface RawMaterialLotDocument extends Document {
    rawMaterialId: mongoose.Types.ObjectId;
    lotNumber: string;
    expiryDate: Date;
    receivedDate: Date;
    initialQuantity: number;
    availableQuantity: number;
    unit: RawMaterialUnit;
    costPerUnit: number;
    sourceType: RawMaterialSourceType;
    vendorId?: mongoose.Types.ObjectId | undefined;
    supplier?: {
        name: string;
        contact?: string;
        invoiceNumber?: string;
    };
    farmDetails?: {
        farmName: string;
        plotId?: string;
        harvestDate: Date;
        harvestLotNumber?: string;
        valuationMethod: "OPERATIONAL_COST" | "MARKET_RATE" | "ZERO_COST";
    };
    status: RawMaterialLotStatus;
    isDepleted: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SupplierSubSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        contact: { type: String, trim: true },
        invoiceNumber: { type: String, trim: true },
    },
    { _id: false }
);

const FarmDetailsSubSchema = new Schema(
    {
        farmName: { type: String, required: true, trim: true },
        plotId: { type: String, trim: true },
        harvestDate: { type: Date, required: true },
        harvestLotNumber: { type: String, trim: true },
        valuationMethod: {
            type: String,
            enum: ["OPERATIONAL_COST", "MARKET_RATE", "ZERO_COST"],
            required: true,
        },
    },
    { _id: false }
);

const RawMaterialLotSchema = new Schema<RawMaterialLotDocument>(
    {
        rawMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            required: true,
            index: true,
        },
        lotNumber: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        expiryDate: {
            type: Date,
            required: true,
            index: true,
        },
        receivedDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        initialQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        availableQuantity: {
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
        sourceType: {
            type: String,
            enum: ["EXTERNAL_VENDOR", "OWN_FARM", "MANUFACTURED"],
            required: true,
            default: "EXTERNAL_VENDOR",
        },
        vendorId: {
            type: Schema.Types.ObjectId,
            ref: "Vendor",
            default: undefined,
            index: true,
        },
        supplier: {
            type: SupplierSubSchema,
            default: undefined,
        },
        farmDetails: {
            type: FarmDetailsSubSchema,
            default: undefined,
        },
        status: {
            type: String,
            enum: ["AVAILABLE", "EXPIRED", "DEPLETED", "BLOCKED", "QUARANTINED", "REJECTED"],
            default: "AVAILABLE",
            required: true,
            index: true,
        },
        isDepleted: {
            type: Boolean,
            required: true,
            default: false,
            index: true,
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

// Compound index for FEFO (First Expired, First Out) querying with status guard
RawMaterialLotSchema.index({ rawMaterialId: 1, status: 1, isDepleted: 1, expiryDate: 1 });

export const RawMaterialLotModel =
    (mongoose.models.RawMaterialLot as Model<RawMaterialLotDocument>) ||
    model<RawMaterialLotDocument>("RawMaterialLot", RawMaterialLotSchema);
