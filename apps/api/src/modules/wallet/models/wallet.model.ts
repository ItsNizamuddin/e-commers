import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const walletSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
            required: true,
            uppercase: true,
            trim: true,
        },
        balanceMinor: {
            type: Number,
            default: 0,
            required: true,
            min: [0, "Wallet balance cannot be negative"],
            validate: {
                validator: Number.isInteger,
                message: "balanceMinor must be an integer (paise)",
            },
        },
        status: {
            type: String,
            enum: ["ACTIVE", "FROZEN", "SUSPENDED"],
            default: "ACTIVE",
            required: true,
        },
        version: {
            type: Number,
            default: 0,
            required: true,
        },
    },
    {
        timestamps: true,
        collection: "wallets",
    }
);

walletSchema.index({ userId: 1 }, { unique: true });
walletSchema.index({ status: 1 });

export type WalletDocument = HydratedDocument<InferSchemaType<typeof walletSchema>>;

export const WalletModel =
    (mongoose.models.Wallet as Model<WalletDocument>) ||
    model<WalletDocument>("Wallet", walletSchema);
