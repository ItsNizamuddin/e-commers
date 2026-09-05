import { Schema, model, models, Model } from "mongoose";
import { CartDocument, CartItemDocument } from "../types/cart.types.js";

const CartItemPriceSnapshotSchema = new Schema(
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
        capturedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    { _id: false }
);

export const CartItemSchema = new Schema<CartItemDocument>(
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
        title: {
            type: String,
            required: true,
            trim: true,
        },
        thumbnail: {
            type: String,
            trim: true,
            default: undefined,
        },
        priceSnapshot: {
            type: CartItemPriceSnapshotSchema,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        attributes: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
    },
    {
        _id: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

CartItemSchema.virtual("lineTotal").get(function (this: CartItemDocument) {
    const unitPrice = this.priceSnapshot?.amount ?? 0;
    const qty = this.quantity ?? 0;
    return Number((unitPrice * qty).toFixed(2));
});

export const CartSchema = new Schema<CartDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: undefined,
        },
        sessionId: {
            type: String,
            trim: true,
            default: undefined,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "LOCKED", "MERGED", "CONVERTED_TO_ORDER"],
            default: "ACTIVE",
            required: true,
        },
        currency: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            default: "USD",
        },
        items: {
            type: [CartItemSchema],
            default: [],
        },
        version: {
            type: Number,
            required: true,
            default: 1,
        },
        lockedAt: {
            type: Date,
            default: undefined,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtuals for Cart summary calculations
CartSchema.virtual("subtotal").get(function (this: CartDocument) {
    if (!this.items || this.items.length === 0) return 0;
    const total = this.items.reduce((sum, item) => {
        const itemTotal = (item.priceSnapshot?.amount ?? 0) * (item.quantity ?? 0);
        return sum + itemTotal;
    }, 0);
    return Number(total.toFixed(2));
});

CartSchema.virtual("itemCount").get(function (this: CartDocument) {
    if (!this.items || this.items.length === 0) return 0;
    return this.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
});

CartSchema.virtual("uniqueItemCount").get(function (this: CartDocument) {
    return this.items ? this.items.length : 0;
});

// Single active cart per user (allows multiple historical MERGED / CONVERTED_TO_ORDER carts)
CartSchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { userId: { $exists: true }, status: "ACTIVE" } }
);

// Single active cart per guest session
CartSchema.index(
    { sessionId: 1 },
    { unique: true, partialFilterExpression: { sessionId: { $exists: true }, status: "ACTIVE" } }
);

// MongoDB background TTL index (asynchronous cleanup for expired guest carts)
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CartModel =
    (models.Cart as Model<CartDocument>) || model<CartDocument>("Cart", CartSchema);
