import mongoose, { Schema, model, type Document, type Model } from "mongoose";

export interface IOutboxEvent extends Document {
    deduplicationKey?: string;
    eventType: string;
    aggregateType: "ProductionRun" | "RepackagingRun" | "Order" | "RawMaterialLot" | "RawMaterial";
    aggregateId: mongoose.Types.ObjectId;
    payload: Record<string, any>;
    status: "PENDING" | "PROCESSING" | "DISPATCHED" | "FAILED";
    retryCount: number;
    lastError?: string;
    lockedAt?: Date;
    lockedBy?: string;
    scheduledFor: Date;
    createdAt: Date;
    processedAt?: Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
    {
        deduplicationKey: {
            type: String,
            trim: true,
        },
        eventType: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        aggregateType: {
            type: String,
            required: true,
            enum: ["ProductionRun", "RepackagingRun", "Order", "RawMaterialLot", "RawMaterial"],
            index: true,
        },
        aggregateId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        payload: {
            type: Schema.Types.Mixed,
            required: true,
            default: () => ({}),
        },
        status: {
            type: String,
            required: true,
            enum: ["PENDING", "PROCESSING", "DISPATCHED", "FAILED"],
            default: "PENDING",
            index: true,
        },
        retryCount: {
            type: Number,
            required: true,
            default: 0,
        },
        lastError: {
            type: String,
        },
        lockedAt: {
            type: Date,
        },
        lockedBy: {
            type: String,
        },
        scheduledFor: {
            type: Date,
            required: true,
            default: Date.now,
            index: true,
        },
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Sparse unique index to prevent duplicate outbox event generation
OutboxEventSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });

// Compound polling index for high-throughput dispatcher
OutboxEventSchema.index({ status: 1, scheduledFor: 1, createdAt: 1 });

export const OutboxEventModel =
    (mongoose.models.OutboxEvent as Model<IOutboxEvent>) ||
    model<IOutboxEvent>("OutboxEvent", OutboxEventSchema);
