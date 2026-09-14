import mongoose, { Schema, model, Model, Document } from "mongoose";
import { VendorStatus } from "@ecommers/types";

export interface VendorDocument extends Document {
    name: string;
    contactNumber?: string | undefined;
    email?: string | undefined;
    gstin?: string | undefined;
    address?: string | undefined;
    status: VendorStatus;
    notes?: string | undefined;
    totalIntakes: number;
    totalSpend: number;
    lastPurchaseDate?: Date | undefined;
    createdAt: Date;
    updatedAt: Date;
}

const VendorSchema = new Schema<VendorDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        contactNumber: {
            type: String,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        gstin: {
            type: String,
            trim: true,
            uppercase: true,
        },
        address: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
            index: true,
        },
        notes: {
            type: String,
            trim: true,
        },
        totalIntakes: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalSpend: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastPurchaseDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
            transform: (_doc, ret: Record<string, any>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                return ret;
            },
        },
    }
);

VendorSchema.index({ name: 1, contactNumber: 1 });
VendorSchema.index({ name: "text", contactNumber: "text" });

export const VendorModel =
    (mongoose.models.Vendor as Model<VendorDocument>) ||
    model<VendorDocument>("Vendor", VendorSchema);
