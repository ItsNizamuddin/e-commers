import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const walletPaymentAllocationSchema = new Schema(
    {
        checkoutId: {
            type: Schema.Types.ObjectId,
            ref: "Checkout",
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: false,
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ["STRIPE", "RAZORPAY", "MOCK"],
            required: true,
        },
        walletAmountMinor: {
            type: Number,
            required: true,
            min: [0, "Wallet amount minor cannot be negative"],
            validate: {
                validator: Number.isInteger,
                message: "walletAmountMinor must be an integer",
            },
        },
        externalAmountMinor: {
            type: Number,
            required: true,
            min: [0, "External amount minor cannot be negative"],
            validate: {
                validator: Number.isInteger,
                message: "externalAmountMinor must be an integer",
            },
        },
        totalAmountMinor: {
            type: Number,
            required: true,
            min: [1, "Total amount minor must be at least 1"],
            validate: {
                validator: Number.isInteger,
                message: "totalAmountMinor must be an integer",
            },
        },
        status: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
            default: "PENDING",
            required: true,
            index: true,
        },
        walletTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "WalletTransaction",
            required: false,
        },
        reversalTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "WalletTransaction",
            required: false,
        },
        externalPaymentId: {
            type: String,
            required: false,
            trim: true,
        },
        gatewayIdempotencyKey: {
            type: String,
            required: true,
            trim: true,
        },
        idempotencyKey: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "wallet_payment_allocations",
    }
);

walletPaymentAllocationSchema.index({ checkoutId: 1 });
walletPaymentAllocationSchema.index({ orderId: 1 });
walletPaymentAllocationSchema.index({ idempotencyKey: 1 }, { unique: true });
walletPaymentAllocationSchema.index(
    { provider: 1, externalPaymentId: 1 },
    { unique: true, sparse: true }
);

export type WalletPaymentAllocationDocument = HydratedDocument<
    InferSchemaType<typeof walletPaymentAllocationSchema>
>;

export const WalletPaymentAllocationModel =
    (mongoose.models.WalletPaymentAllocation as Model<WalletPaymentAllocationDocument>) ||
    model<WalletPaymentAllocationDocument>("WalletPaymentAllocation", walletPaymentAllocationSchema);
