import mongoose, { Schema, model, Model, Document } from "mongoose";
import { RawMaterialUnit, RawMaterialStockMovementType } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface RawMaterialStockMovementDocument extends Document {
    rawMaterialId: mongoose.Types.ObjectId;
    lotId?: mongoose.Types.ObjectId;
    lotNumber?: string;
    type: RawMaterialStockMovementType;
    quantityDelta: number;
    unit: RawMaterialUnit;
    previousStock: number;
    newStock: number;
    referenceType: "PURCHASE" | "PRODUCTION_RUN" | "REPACKAGING_RUN" | "MANUAL_AUDIT" | "SCRAP_DISPOSAL";
    referenceId: string;
    reason?: string;
    actor?: any;
    createdAt: Date;
}

const RawMaterialStockMovementSchema = new Schema<RawMaterialStockMovementDocument>(
    {
        rawMaterialId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterial",
            required: true,
            index: true,
        },
        lotId: {
            type: Schema.Types.ObjectId,
            ref: "RawMaterialLot",
            default: undefined,
        },
        lotNumber: {
            type: String,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: [
                "PURCHASE_INTAKE",
                "PRODUCTION_OUTPUT",
                "MANUFACTURING_CONSUMPTION",
                "MANUFACTURING_REVERSAL",
                "REPACKAGING_CONSUMPTION",
                "REPACKAGING_REVERSAL",
                "WASTAGE_SCRAP",
                "MANUAL_ADJUSTMENT",
                "RETURN_TO_SUPPLIER",
            ],
            required: true,
            index: true,
        },
        quantityDelta: {
            type: Number,
            required: true,
        },
        unit: {
            type: String,
            enum: ["kg", "g", "l", "ml", "pcs", "pack"],
            required: true,
        },
        previousStock: {
            type: Number,
            required: true,
        },
        newStock: {
            type: Number,
            required: true,
        },
        referenceType: {
            type: String,
            enum: ["PURCHASE", "PRODUCTION_RUN", "REPACKAGING_RUN", "MANUAL_AUDIT", "SCRAP_DISPOSAL"],
            required: true,
            index: true,
        },
        referenceId: {
            type: String,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            trim: true,
        },
        actor: {
            type: AuditActorSchema,
            default: undefined,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
            index: true,
        },
    },
    {
        timestamps: false,
        versionKey: false,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                delete ret._id;
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

// Enforce strict ledger immutability at the schema layer
const immutableBlocker = function () {
    throw new Error("RawMaterialStockMovement records are strictly immutable and cannot be updated or deleted.");
};

RawMaterialStockMovementSchema.pre("updateOne", immutableBlocker);
RawMaterialStockMovementSchema.pre("updateMany", immutableBlocker);
RawMaterialStockMovementSchema.pre("findOneAndUpdate", immutableBlocker);
RawMaterialStockMovementSchema.pre("deleteOne", immutableBlocker);
RawMaterialStockMovementSchema.pre("findOneAndDelete", immutableBlocker);
RawMaterialStockMovementSchema.pre("deleteMany", function () {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    throw new Error("RawMaterialStockMovement records are strictly immutable and cannot be deleted.");
});

RawMaterialStockMovementSchema.index({ rawMaterialId: 1, createdAt: -1 });
RawMaterialStockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const RawMaterialStockMovementModel =
    (mongoose.models.RawMaterialStockMovement as Model<RawMaterialStockMovementDocument>) ||
    model<RawMaterialStockMovementDocument>("RawMaterialStockMovement", RawMaterialStockMovementSchema);

export const RawMaterialLedgerModel = RawMaterialStockMovementModel;
