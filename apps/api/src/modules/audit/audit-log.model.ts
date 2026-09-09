import mongoose, { Schema, model, Document, Model } from "mongoose";
import type { AuditAction, AuditActor, AuditLogTarget } from "@ecommers/types";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface IAuditLog extends Document {
    action: AuditAction;
    actor: AuditActor;
    target?: AuditLogTarget;
    ipAddress?: string;
    userAgent?: string;
    status: "SUCCESS" | "FAILURE";
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        action: {
            type: String,
            required: true,
            index: true,
        },
        actor: {
            type: AuditActorSchema,
            required: true,
        },
        target: {
            resource: { type: String, required: true, index: true },
            resourceId: { type: String },
            details: { type: Schema.Types.Mixed },
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
        status: {
            type: String,
            enum: ["SUCCESS", "FAILURE"],
            default: "SUCCESS",
            required: true,
        },
        errorMessage: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "audit_logs",
    }
);

// Compound indexes for performant audit filtering & chronological inspection
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ "target.resource": 1, createdAt: -1 });

export const AuditLogModel = (mongoose.models.AuditLog as Model<IAuditLog>) || model<IAuditLog>("AuditLog", AuditLogSchema);
