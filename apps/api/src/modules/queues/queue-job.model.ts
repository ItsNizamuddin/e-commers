import mongoose, { Schema, model, type Document } from "mongoose";

export interface IQueueJobAudit {
    triggeredBy?: {
        userId?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        role?: string | undefined;
        source: "USER" | "OUTBOX_DISPATCHER" | "CRON_SCHEDULER" | "SYSTEM";
    } | undefined;
    aggregateType?: "ProductionRun" | "RepackagingRun" | "Order" | "RawMaterialLot" | "RawMaterial" | "User" | "System" | "SEO" | "Product" | "Category" | undefined;
    aggregateId?: string | undefined;
    referenceNumber?: string | undefined; // e.g. "MFG-20260912-9873", "ORD-991", "LOT-WHEAT-001"
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    correlationId?: string | undefined;
    reason?: string | undefined;
}

export interface IQueueJobAuditHistory {
    action: "CREATED" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRY_TRIGGERED";
    timestamp: Date;
    attempt: number;
    workerPid?: string;
    notes?: string;
}

export interface IQueueJob extends Document {
    jobId: string;
    queueName: string;
    jobName: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    payload: Record<string, any>;
    result?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
    };
    attempts: number;
    maxAttempts: number;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    audit: IQueueJobAudit;
    auditHistory: IQueueJobAuditHistory[];
    createdAt: Date;
    updatedAt: Date;
}

const QueueJobSchema = new Schema<IQueueJob>(
    {
        jobId: {
            type: String,
            required: true,
            trim: true,
        },
        queueName: {
            type: String,
            required: true,
            trim: true,
        },
        jobName: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
            default: "PENDING",
        },
        payload: {
            type: Schema.Types.Mixed,
            default: () => ({}),
        },
        result: {
            type: Schema.Types.Mixed,
        },
        error: {
            message: { type: String },
            stack: { type: String },
        },
        attempts: {
            type: Number,
            required: true,
            default: 0,
        },
        maxAttempts: {
            type: Number,
            required: true,
            default: 3,
        },
        startedAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        durationMs: {
            type: Number,
        },
        audit: {
            triggeredBy: {
                userId: { type: String, trim: true },
                name: { type: String, trim: true },
                email: { type: String, trim: true },
                role: { type: String, trim: true },
                source: {
                    type: String,
                    enum: ["USER", "OUTBOX_DISPATCHER", "CRON_SCHEDULER", "SYSTEM"],
                    default: "SYSTEM",
                },
            },
            aggregateType: {
                type: String,
                enum: ["ProductionRun", "RepackagingRun", "Order", "RawMaterialLot", "RawMaterial", "User", "System", "SEO", "Product", "Category"],
            },
            aggregateId: {
                type: String,
                trim: true,
            },
            referenceNumber: {
                type: String,
                trim: true,
            },
            correlationId: { type: String, trim: true },
            ipAddress: { type: String },
            userAgent: { type: String },
            reason: { type: String, trim: true },
        },
        auditHistory: [
            {
                action: {
                    type: String,
                    required: true,
                    enum: ["CREATED", "PROCESSING", "COMPLETED", "FAILED", "RETRY_TRIGGERED"],
                },
                timestamp: {
                    type: Date,
                    required: true,
                    default: Date.now,
                },
                attempt: {
                    type: Number,
                    required: true,
                },
                workerPid: { type: String },
                notes: { type: String },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Enforce global uniqueness on deterministic jobId for worker idempotency
QueueJobSchema.index({ jobId: 1 }, { unique: true });

// Indexes for admin dashboard and compliance audits
QueueJobSchema.index({ queueName: 1, status: 1, createdAt: -1 });
QueueJobSchema.index({ jobName: 1, createdAt: -1 });
QueueJobSchema.index({ "audit.aggregateType": 1, "audit.aggregateId": 1 });
QueueJobSchema.index({ "audit.referenceNumber": 1 });
QueueJobSchema.index({ "audit.correlationId": 1 });
QueueJobSchema.index({ "audit.triggeredBy.userId": 1 });

export const QueueJobModel =
    (mongoose.models.QueueJob as mongoose.Model<IQueueJob>) || model<IQueueJob>("QueueJob", QueueJobSchema);
