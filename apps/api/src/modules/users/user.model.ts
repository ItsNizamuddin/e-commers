import { Schema, model, type InferSchemaType } from "mongoose";

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
            enum: ["CUSTOMER", "ADMIN"],
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

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);