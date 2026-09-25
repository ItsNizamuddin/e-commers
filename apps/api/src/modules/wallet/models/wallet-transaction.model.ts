import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const walletTransactionSchema = new Schema(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
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
        type: {
            type: String,
            enum: ["CREDIT", "DEBIT"],
            required: true,
        },
        purpose: {
            type: String,
            enum: [
                "TOP_UP",
                "ORDER_PAYMENT",
                "ORDER_REFUND",
                "PAYMENT_REVERSAL",
                "ADMIN_ADJUSTMENT",
                "CASHBACK",
                "PROMOTIONAL",
                "SIGNUP_BONUS",
            ],
            required: true,
        },
        amountMinor: {
            type: Number,
            required: true,
            min: [1, "Amount minor must be at least 1 paisa"],
            validate: {
                validator: Number.isInteger,
                message: "amountMinor must be an integer",
            },
        },
        balanceBeforeMinor: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: "balanceBeforeMinor must be an integer",
            },
        },
        balanceAfterMinor: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: "balanceAfterMinor must be an integer",
            },
        },
        referenceType: {
            type: String,
            enum: ["ORDER", "CHECKOUT", "TOPUP", "REFUND", "ADMIN", "REGISTRATION", "ADJUSTMENT"],
            required: true,
        },
        referenceId: {
            type: String,
            required: true,
            trim: true,
        },
        idempotencyKey: {
            type: String,
            required: false,
            trim: true,
        },
        status: {
            type: String,
            enum: ["COMPLETED"],
            default: "COMPLETED",
            required: true,
        },
        createdBy: {
            type: String,
            enum: ["CUSTOMER", "SYSTEM", "ADMIN", "WEBHOOK"],
            required: true,
        },
        adminActorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        metadata: {
            type: Schema.Types.Mixed,
            required: false,
        },
    },
    {
        timestamps: true,
        collection: "wallet_transactions",
    }
);

walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
walletTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export type WalletTransactionDocument = HydratedDocument<InferSchemaType<typeof walletTransactionSchema>>;

export const WalletTransactionModel =
    (mongoose.models.WalletTransaction as Model<WalletTransactionDocument>) ||
    model<WalletTransactionDocument>("WalletTransaction", walletTransactionSchema);
