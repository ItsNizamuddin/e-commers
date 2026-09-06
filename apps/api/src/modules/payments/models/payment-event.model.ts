import mongoose, { Schema } from "mongoose";
import { IPaymentEvent, PaymentEventDocument } from "../types/payment.types.js";

const paymentEventSchema = new Schema<PaymentEventDocument>(
    {
        provider: {
            type: String,
            enum: ["STRIPE", "RAZORPAY", "MOCK"],
            required: true,
        },
        eventId: {
            type: String,
            required: true,
            trim: true,
        },
        eventType: {
            type: String,
            required: true,
            trim: true,
        },
        paymentIntentId: {
            type: String,
            required: false,
            index: true,
        },
        checkoutId: {
            type: String,
            required: false,
            index: true,
        },
        status: {
            type: String,
            enum: ["RECEIVED", "PROCESSING", "PROCESSED", "FAILED"],
            default: "RECEIVED",
            index: true,
        },
        lockedAt: {
            type: Date,
            required: false,
        },
        processedAt: {
            type: Date,
            required: false,
        },
        errorMessage: {
            type: String,
            required: false,
        },
        payload: {
            type: Schema.Types.Mixed,
            required: false,
        },
    },
    {
        timestamps: true,
        collection: "payment_events",
    }
);

// Compound unique index ensuring idempotency per provider + eventId
paymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

// TTL index to automatically purge processed event logs after 90 days
paymentEventSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export const PaymentEventModel =
    (mongoose.models.PaymentEvent as mongoose.Model<PaymentEventDocument>) ||
    mongoose.model<PaymentEventDocument>("PaymentEvent", paymentEventSchema);
