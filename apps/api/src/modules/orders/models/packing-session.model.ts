import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { PackingStatus, PackingScanResult, AuditActor } from "@ecommers/types";

export interface PackingSessionItemDoc {
    orderItemId: string;
    variantId: string;
    productTitle: string;
    variantTitle?: string | undefined;
    lotId: Types.ObjectId;
    lotNumber: string;
    requiredQty: number;
    verifiedQty: number;
}

export interface PackingScanEventDoc {
    eventId: string;
    barcode: string;
    lotId?: Types.ObjectId | undefined;
    lotNumber?: string | undefined;
    result: PackingScanResult;
    message: string;
    quantity: number;
    scannedBy?: AuditActor | undefined;
    stationId: string;
    scannedAt: Date;
}

export interface PackingSessionDocument extends Document {
    orderId: Types.ObjectId;
    orderNumber: string;
    status: PackingStatus;
    sessionNumber: number;
    stationId: string;
    startedBy?: AuditActor | undefined;
    startedAt: Date;
    completedBy?: AuditActor | undefined;
    completedAt?: Date | undefined;
    items: PackingSessionItemDoc[];
    scanEvents: PackingScanEventDoc[];
    resetReason?: string | undefined;
    resetAt?: Date | undefined;
    resetBy?: AuditActor | undefined;
    createdAt: Date;
    updatedAt: Date;
}

const PackingSessionItemSchema = new Schema<PackingSessionItemDoc>(
    {
        orderItemId: { type: String, required: true },
        variantId: { type: String, required: true },
        productTitle: { type: String, required: true },
        variantTitle: { type: String },
        lotId: { type: Schema.Types.ObjectId, ref: "FinishedGoodsLot", required: true },
        lotNumber: { type: String, required: true },
        requiredQty: { type: Number, required: true, min: 1 },
        verifiedQty: { type: Number, required: true, default: 0, min: 0 },
    },
    { _id: false }
);

const AuditActorSubSchema = new Schema<AuditActor>(
    {
        id: { type: String, required: true },
        email: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
    },
    { _id: false }
);

const PackingScanEventSchema = new Schema<PackingScanEventDoc>(
    {
        eventId: { type: String, required: true },
        barcode: { type: String, required: true },
        lotId: { type: Schema.Types.ObjectId, ref: "FinishedGoodsLot" },
        lotNumber: { type: String },
        result: {
            type: String,
            enum: [
                "MATCHED",
                "ALREADY_COMPLETED",
                "WRONG_LOT",
                "NOT_FOUND",
                "EXPIRED",
                "RECALLED",
                "QUARANTINED",
                "INVALID_CODE",
            ],
            required: true,
        },
        message: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        scannedBy: { type: AuditActorSubSchema },
        stationId: { type: String, required: true },
        scannedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const PackingSessionSchema = new Schema<PackingSessionDocument>(
    {
        orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
        orderNumber: { type: String, required: true, index: true },
        status: {
            type: String,
            enum: ["NOT_STARTED", "IN_PROGRESS", "VERIFIED", "CANCELLED"],
            default: "NOT_STARTED",
            required: true,
            index: true,
        },
        sessionNumber: { type: Number, default: 1, required: true },
        stationId: { type: String, default: "PACK-BENCH-01", required: true },
        startedBy: { type: AuditActorSubSchema },
        startedAt: { type: Date, default: Date.now },
        completedBy: { type: AuditActorSubSchema },
        completedAt: { type: Date },
        items: [PackingSessionItemSchema],
        scanEvents: [PackingScanEventSchema],
        resetReason: { type: String },
        resetAt: { type: Date },
        resetBy: { type: AuditActorSubSchema },
    },
    { timestamps: true }
);

PackingSessionSchema.index({ orderId: 1, status: 1 });
PackingSessionSchema.index({ orderId: 1, sessionNumber: 1 }, { unique: true });
PackingSessionSchema.index({ orderId: 1, sessionNumber: -1 });

export const PackingSessionModel: Model<PackingSessionDocument> =
    mongoose.models.PackingSession ||
    mongoose.model<PackingSessionDocument>("PackingSession", PackingSessionSchema);
