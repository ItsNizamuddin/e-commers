import mongoose, { Schema, model, type Model, type HydratedDocument, type InferSchemaType } from "mongoose";

const walletConfigSchema = new Schema(
    {
        isSingleton: {
            type: Boolean,
            default: true,
            unique: true,
            required: true,
        },
        signupBonusEnabled: {
            type: Boolean,
            default: true,
            required: true,
        },
        signupBonusByCurrency: {
            type: Map,
            of: Number,
            default: () => ({
                INR: 5000, // ₹50.00 (5000 paise)
                USD: 500,  // $5.00 (500 cents)
                EUR: 500,  // €5.00 (500 cents)
                GBP: 400,  // £4.00 (400 pence)
                AED: 2000, // AED 20.00 (2000 fils)
            }),
            required: true,
        },
        defaultCurrency: {
            type: String,
            default: "INR",
            required: true,
            uppercase: true,
            trim: true,
        },
        countryToCurrency: {
            type: Map,
            of: String,
            default: () => ({
                IN: "INR",
                US: "USD",
                GB: "GBP",
                AE: "AED",
                CA: "CAD",
                AU: "AUD",
                DE: "EUR",
                FR: "EUR",
                IT: "EUR",
                ES: "EUR",
                NL: "EUR",
            }),
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
    },
    {
        timestamps: true,
        collection: "wallet_configs",
    }
);

export type WalletConfigDocument = HydratedDocument<InferSchemaType<typeof walletConfigSchema>>;

export const WalletConfigModel =
    (mongoose.models.WalletConfig as Model<WalletConfigDocument>) ||
    model<WalletConfigDocument>("WalletConfig", walletConfigSchema);
