import { Schema, model, models, Model } from "mongoose";
import { CheckoutDocument } from "../types/checkout.types.js";

const CheckoutAddressSchema = new Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, uppercase: true, trim: true },
        phone: { type: String, trim: true, default: undefined },
    },
    { _id: false }
);

const CheckoutItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: String,
            required: true,
            trim: true,
        },
        sku: {
            type: String,
            required: true,
            trim: true,
        },
        productTitle: {
            type: String,
            required: true,
            trim: true,
        },
        variantTitle: {
            type: String,
            required: true,
            trim: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        unitPriceMinor: {
            type: Number,
            required: true,
            min: 0,
        },
        lineTotalMinor: {
            type: Number,
            required: true,
            min: 0,
        },
        productVersion: {
            type: Number,
            required: true,
            min: 1,
        },
        priceCapturedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { _id: false }
);

const CheckoutPricingSchema = new Schema(
    {
        subtotalMinor: { type: Number, required: true, min: 0 },
        shippingMinor: { type: Number, required: true, min: 0, default: 0 },
        taxMinor: { type: Number, required: true, min: 0, default: 0 },
        discountMinor: { type: Number, required: true, min: 0, default: 0 },
        grandTotalMinor: { type: Number, required: true, min: 0 },
        currency: { type: String, required: true, uppercase: true, trim: true },
    },
    { _id: false }
);

export const CheckoutSchema = new Schema<CheckoutDocument>(
    {
        cartId: {
            type: Schema.Types.ObjectId,
            ref: "Cart",
            required: true,
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: undefined,
            index: true,
            sparse: true,
        },
        guestSessionId: {
            type: String,
            trim: true,
            default: undefined,
            index: true,
            sparse: true,
        },
        customerEmailSnapshot: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
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
                "INITIATED",
                "INVENTORY_RESERVED",
                "PAYMENT_PENDING",
                "COMPLETED",
                "PAYMENT_FAILED",
                "EXPIRED",
                "CANCELLED",
            ],
            default: "INVENTORY_RESERVED",
            required: true,
        },
        items: {
            type: [CheckoutItemSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
                message: "Checkout must contain at least one item",
            },
        },
        pricing: {
            type: CheckoutPricingSchema,
            required: true,
        },
        shippingAddressSnapshot: {
            type: CheckoutAddressSchema,
            default: undefined,
        },
        billingAddressSnapshot: {
            type: CheckoutAddressSchema,
            default: undefined,
        },
        reservationId: {
            type: Schema.Types.ObjectId,
            ref: "Reservation",
            default: undefined,
        },
        paymentIntentId: {
            type: String,
            trim: true,
            default: undefined,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            default: undefined,
        },
        idempotencyKey: {
            type: String,
            trim: true,
            default: undefined,
            index: true,
            sparse: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        version: {
            type: Number,
            required: true,
            default: 1,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Strict Identity Invariant: Exactly one of customerId OR guestSessionId must be set
CheckoutSchema.pre("validate", function (this: CheckoutDocument) {
    const hasCustomer = Boolean(this.customerId);
    const hasGuest = Boolean(this.guestSessionId);

    if ((hasCustomer && hasGuest) || (!hasCustomer && !hasGuest)) {
        throw new Error(
            "Checkout must be identified by exactly one of 'customerId' OR 'guestSessionId'."
        );
    }
});

// TTL Index for automatic MongoDB background cleanup of expired checkouts
CheckoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for active checkout lookup
CheckoutSchema.index({ cartId: 1, status: 1 });
CheckoutSchema.index({ customerId: 1, status: 1 });
CheckoutSchema.index({ guestSessionId: 1, status: 1 });

export const CheckoutModel =
    (models.Checkout as Model<CheckoutDocument>) ||
    model<CheckoutDocument>("Checkout", CheckoutSchema);
