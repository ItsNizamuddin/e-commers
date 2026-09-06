import mongoose, { Schema } from "mongoose";
import { IPayment, PaymentDocument } from "../types/payment.types.js";

const paymentSchema = new Schema<PaymentDocument>(
    {
        checkoutId: {
            type: Schema.Types.ObjectId,
            ref: "Checkout",
            required: true,
            index: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: false,
            index: true,
        },
        paymentIntentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        provider: {
            type: String,
            enum: ["STRIPE", "RAZORPAY", "MOCK"],
            required: true,
        },
        amountMinor: {
            type: Number,
            required: true,
            min: [1, "Amount minor must be at least 1"],
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: [
                "PENDING",
                "AUTHORIZED",
                "CAPTURED",
                "FAILED",
                "REFUND_REQUESTED",
                "REFUNDED",
                "PARTIALLY_REFUNDED",
            ],
            default: "PENDING",
            index: true,
        },
        clientSecret: {
            type: String,
            required: false,
            select: false, // Protected from accidental leakage in find queries
        },
        rawProviderPayload: {
            type: Schema.Types.Mixed,
            required: false,
        },
        errorMessage: {
            type: String,
            required: false,
        },
        capturedAt: {
            type: Date,
            required: false,
        },
        refundedAt: {
            type: Date,
            required: false,
        },
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
        collection: "payments",
    }
);

paymentSchema.index({ checkoutId: 1, createdAt: -1 });

export const PaymentModel =
    (mongoose.models.Payment as mongoose.Model<PaymentDocument>) ||
    mongoose.model<PaymentDocument>("Payment", paymentSchema);
