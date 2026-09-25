import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const walletTopUpSchema = new Schema(
    {
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
        amountMinor: {
            type: Number,
            required: true,
            min: [1000, "Minimum top-up is ₹10.00 (1000 paise)"],
            max: [5000000, "Maximum top-up is ₹50,000.00 (5000000 paise)"],
            validate: {
                validator: Number.isInteger,
                message: "amountMinor must be an integer",
            },
        },
        currency: {
            type: String,
            default: "INR",
            required: true,
            uppercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["CREATED", "PAYMENT_PENDING", "SUCCESS", "FAILED", "EXPIRED", "REVERSED"],
            default: "CREATED",
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ["STRIPE", "RAZORPAY", "MOCK"],
            required: true,
        },
        providerPaymentId: {
            type: String,
            required: false,
            trim: true,
        },
        clientSecret: {
            type: String,
            required: false,
            select: false,
        },
        idempotencyKey: {
            type: String,
            required: true,
            trim: true,
        },
        failureReason: {
            type: String,
            required: false,
        },
        completedAt: {
            type: Date,
            required: false,
        },
    },
    {
        timestamps: true,
        collection: "wallet_topups",
    }
);

walletTopUpSchema.index({ idempotencyKey: 1 }, { unique: true });
walletTopUpSchema.index({ provider: 1, providerPaymentId: 1 }, { unique: true, sparse: true });
walletTopUpSchema.index({ userId: 1, createdAt: -1 });

export type WalletTopUpDocument = HydratedDocument<InferSchemaType<typeof walletTopUpSchema>>;

export const WalletTopUpModel =
    (mongoose.models.WalletTopUp as Model<WalletTopUpDocument>) ||
    model<WalletTopUpDocument>("WalletTopUp", walletTopUpSchema);
