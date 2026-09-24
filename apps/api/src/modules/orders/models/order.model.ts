import mongoose, { Schema } from "mongoose";
import { IOrder, IOrderItem, OrderDocument } from "../types/order.types.js";

const allocatedLotSchema = new Schema(
    {
        lotId: {
            type: Schema.Types.ObjectId,
            ref: "FinishedGoodsLot",
            required: true,
        },
        lotNumber: {
            type: String,
            required: true,
        },
        packagingRunId: {
            type: Schema.Types.ObjectId,
            ref: "RepackagingRun",
            required: false,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            ref: "Warehouse",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        allocatedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
    {
        productId: {
            type: String,
            required: true,
        },
        variantId: {
            type: String,
            required: true,
        },
        sku: {
            type: String,
            required: true,
        },
        productTitle: {
            type: String,
            required: true,
        },
        variantTitle: {
            type: String,
            required: true,
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
        },
        unitPriceMinor: {
            type: Number,
            required: true,
        },
        lineTotalMinor: {
            type: Number,
            required: true,
        },
        allocatedLots: {
            type: [allocatedLotSchema],
            default: undefined,
        },
    },
    { _id: false }
);

const addressSnapshotSchema = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true, uppercase: true },
        phone: { type: String, required: false },
    },
    { _id: false }
);

const auditActorSchema = new Schema(
    {
        userId: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, required: true },
    },
    { _id: false }
);

const orderSchema = new Schema<OrderDocument>(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        checkoutId: {
            type: Schema.Types.ObjectId,
            ref: "Checkout",
            required: true,
            unique: true,
            index: true,
        },
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: "Payment",
            required: true,
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true,
        },
        customerEmailSnapshot: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: [
                (val: IOrderItem[]) => val.length > 0,
                "Order must contain at least one item",
            ],
        },
        shippingAddressSnapshot: {
            type: addressSnapshotSchema,
            required: true,
        },
        billingAddressSnapshot: {
            type: addressSnapshotSchema,
            required: true,
        },
        pricing: {
            subtotalMinor: { type: Number, required: true },
            shippingMinor: { type: Number, required: true, default: 0 },
            taxMinor: { type: Number, required: true, default: 0 },
            discountMinor: { type: Number, required: true, default: 0 },
            grandTotalMinor: { type: Number, required: true },
            currency: { type: String, required: true, uppercase: true },
            couponCode: { type: String, required: false },
            shippingMethod: { type: String, required: false, default: "STANDARD" },
            taxRateBasis: { type: String, required: false },
        },
        orderStatus: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
            default: "CONFIRMED",
            index: true,
        },
        paymentStatus: {
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
            default: "CAPTURED",
            index: true,
        },
        fulfillmentStatus: {
            type: String,
            enum: [
                "UNFULFILLED",
                "PROCESSING",
                "SHIPPED",
                "DELIVERED",
                "RETURNED",
            ],
            default: "UNFULFILLED",
            index: true,
        },
        fulfillment: {
            carrier: { type: String, required: false },
            trackingNumber: { type: String, required: false },
            shippedAt: { type: Date, required: false },
            deliveredAt: { type: Date, required: false },
        },
        guestAccessToken: {
            type: String,
            required: false,
            select: false, // Protected from accidental exposure
        },
        createdBy: {
            type: auditActorSchema,
            required: false,
        },
        updatedBy: {
            type: auditActorSchema,
            required: false,
        },
        placedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
        cancelledAt: {
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
        collection: "orders",
    }
);

// Compound indexes for user history and admin views
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ fulfillmentStatus: 1, createdAt: -1 });
orderSchema.index({ "items.allocatedLots.lotId": 1 });
orderSchema.index({ "items.allocatedLots.lotNumber": 1 });

export const OrderModel =
    (mongoose.models.Order as mongoose.Model<OrderDocument>) ||
    mongoose.model<OrderDocument>("Order", orderSchema);
