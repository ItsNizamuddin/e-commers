import { Schema } from "mongoose";
import { VariantPriceInput } from "@shopsphere/types";

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
    },
    { _id: false }
);
