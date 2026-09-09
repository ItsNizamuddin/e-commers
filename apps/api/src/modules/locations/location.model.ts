import mongoose, { Schema, model, Model, Document } from "mongoose";
import { LocationType } from "@ecommers/types";

export interface LocationDocument extends Document {
    code: string;
    name: string;
    type: LocationType;
    stateOrRegion?: string;
    countryCode: string;
    currency: string;
    isActive: boolean;
    deliveryEstimate: string;
    warehouseId?: mongoose.Types.ObjectId;
    minOrderValue?: number;
    shippingFlatRate?: number;
    postalCodes: string[];
    postalCodePrefixes: string[];
    defaultSeoTitleTemplate?: string;
    defaultSeoDescriptionTemplate?: string;
    deliveryHighlight?: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const LocationSchema = new Schema<LocationDocument>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["CITY", "COUNTRY", "ZONE"],
            required: true,
            default: "CITY",
            index: true,
        },
        stateOrRegion: {
            type: String,
            trim: true,
        },
        countryCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            default: "IN",
            index: true,
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            default: "INR",
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        deliveryEstimate: {
            type: String,
            required: true,
            trim: true,
            default: "Within 24 Hours",
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Warehouse",
            default: undefined,
        },
        minOrderValue: {
            type: Number,
            min: 0,
            default: undefined,
        },
        shippingFlatRate: {
            type: Number,
            min: 0,
            default: undefined,
        },
        postalCodes: {
            type: [String],
            default: [],
            index: true,
        },
        postalCodePrefixes: {
            type: [String],
            default: [],
            index: true,
        },
        defaultSeoTitleTemplate: {
            type: String,
            trim: true,
            default: undefined,
        },
        defaultSeoDescriptionTemplate: {
            type: String,
            trim: true,
            default: undefined,
        },
        deliveryHighlight: {
            type: String,
            trim: true,
            default: undefined,
        },
        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

LocationSchema.index({ type: 1, isActive: 1 });
LocationSchema.index({ countryCode: 1, isActive: 1 });

export const LocationModel =
    (mongoose.models.Location as Model<LocationDocument>) ||
    model<LocationDocument>("Location", LocationSchema);
