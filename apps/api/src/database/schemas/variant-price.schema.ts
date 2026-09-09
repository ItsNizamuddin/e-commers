import { Schema } from "mongoose";
import { VariantPriceInput } from "@ecommers/types";

export const VariantPriceSchema = new Schema<VariantPriceInput>(
    {
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        compareAtAmount: {
            type: Number,
            min: 0,
            default: undefined,
        },
        costAmount: {
            type: Number,
            min: 0,
            default: undefined,
        },
        countryCode: {
            type: String,
            uppercase: true,
            trim: true,
        },
        countryName: {
            type: String,
            trim: true,
        },
        locationCode: {
            type: String,
            lowercase: true,
            trim: true,
        },
        locationName: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);
