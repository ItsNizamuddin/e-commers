import { Schema, model, models, Model, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ALL_ROLES } from "@shopsphere/types";

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },

        passwordHash: {
            type: String,
            required: true,
            select: false,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        role: {
            type: String,
            enum: ALL_ROLES,
            default: "CUSTOMER",
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: "__v",
    },
);

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;

export const UserModel = (models.User as Model<UserDocument>) || model<UserDocument>("User", userSchema);