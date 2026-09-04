import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const sessionSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        sessionType: {
            type: String,
            enum: ["CUSTOMER", "STAFF"],
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // Auto TTL cleanup by MongoDB
        },

        isRevoked: {
            type: Boolean,
            default: false,
            required: true,
        },

        userAgent: {
            type: String,
            default: "unknown",
        },

        ipAddress: {
            type: String,
            default: "unknown",
        },
    },
    {
        timestamps: true,
        versionKey: "__v",
    },
);

export type SessionDocument = HydratedDocument<InferSchemaType<typeof sessionSchema>>;

export const SessionModel = model("Session", sessionSchema);
