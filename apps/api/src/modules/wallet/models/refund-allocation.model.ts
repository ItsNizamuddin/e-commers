import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const refundAllocationSchema = new Schema(
    {
        refundId: {
            type: String,
            required: true,
            trim: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
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
        totalRefundMinor: {
            type: Number,
            required: true,
            min: [1, "Total refund minor must be at least 1"],
            validate: {
                validator: Number.isInteger,
                message: "totalRefundMinor must be an integer",
            },
        },
        walletTransactionId: {
            type: Schema.Types.ObjectId,
            ref: "WalletTransaction",
            required: false,
        },
        externalRefundId: {
            type: String,
            required: false,
            trim: true,
        },
        status: {
            type: String,
            enum: ["REFUND_PENDING", "GATEWAY_REFUND_PENDING", "COMPLETED", "GATEWAY_FAILED"],
            default: "REFUND_PENDING",
            required: true,
            index: true,
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
        collection: "refund_allocations",
    }
);

refundAllocationSchema.index({ orderId: 1, createdAt: -1 });
refundAllocationSchema.index({ refundId: 1 }, { unique: true });

export type RefundAllocationDocument = HydratedDocument<InferSchemaType<typeof refundAllocationSchema>>;

export const RefundAllocationModel =
    (mongoose.models.RefundAllocation as Model<RefundAllocationDocument>) ||
    model<RefundAllocationDocument>("RefundAllocation", refundAllocationSchema);
