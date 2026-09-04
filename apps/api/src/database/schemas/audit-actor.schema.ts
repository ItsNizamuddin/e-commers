import { Schema } from "mongoose";
import { AuditActor } from "@shopsphere/types";

export const AuditActorSchema = new Schema<AuditActor>(
    {
        id: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        role: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);
