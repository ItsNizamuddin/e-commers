import mongoose, { Schema, model, type Document, type Model } from "mongoose";

export interface IIdempotencyRecord extends Document {
    key: string;
    scope: string;
    path: string;
    method: string;
    requestHash: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    responseStatus?: number;
    responseBody?: any;
    expiresAt: Date;
    createdAt: Date;
    completedAt?: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
    {
        key: {
            type: String,
            required: true,
            trim: true,
        },
        scope: {
            type: String,
            required: true,
            trim: true,
        },
        path: {
            type: String,
            required: true,
            trim: true,
        },
        method: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        requestHash: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED"],
            default: "PENDING",
            required: true,
        },
        responseStatus: {
            type: Number,
        },
        responseBody: {
            type: Schema.Types.Mixed,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound uniqueness: { scope: 1, key: 1 } prevents global collision between different users/sessions
IdempotencyRecordSchema.index({ scope: 1, key: 1 }, { unique: true });

// Automatic TTL expiration after 24 hours
IdempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRecordModel =
    (mongoose.models.IdempotencyRecord as Model<IIdempotencyRecord>) ||
    model<IIdempotencyRecord>("IdempotencyRecord", IdempotencyRecordSchema);
