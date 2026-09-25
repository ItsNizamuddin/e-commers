import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const authIdentitySchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        provider: {
            type: String,
            enum: ["GOOGLE", "APPLE", "LOCAL"],
            required: true,
        },
        providerSubject: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
            required: true,
        },
        metadata: {
            name: { type: String, required: false },
            avatarUrl: { type: String, required: false },
        },
    },
    {
        timestamps: true,
        collection: "auth_identities",
    }
);

// Compound unique index enforces 1:1 binding between external provider subject (sub) and account
authIdentitySchema.index({ provider: 1, providerSubject: 1 }, { unique: true });
authIdentitySchema.index({ userId: 1 });
authIdentitySchema.index({ email: 1 });

export type AuthIdentityDocument = HydratedDocument<InferSchemaType<typeof authIdentitySchema>>;

export const AuthIdentityModel =
    (mongoose.models.AuthIdentity as Model<AuthIdentityDocument>) ||
    model<AuthIdentityDocument>("AuthIdentity", authIdentitySchema);
