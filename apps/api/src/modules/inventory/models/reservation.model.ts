import { Schema, model, models, Model } from "mongoose";
import { ReservationDocument } from "../types/reservation.types.js";

const ReservationItemSchema = new Schema(
    {
        variantId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        reservedPhysical: {
            type: Number,
            required: true,
            min: 0,
        },
        backordered: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const ReservationSchema = new Schema<ReservationDocument>(
    {
        checkoutId: {
            type: String,
            required: true,
            index: true,
        },
        idempotencyKey: {
            type: String,
            sparse: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "RELEASED", "EXPIRED"],
            default: "PENDING",
            index: true,
        },
        items: {
            type: [ReservationItemSchema],
            required: true,
            validate: {
                validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
                message: "A reservation must contain at least one item",
            },
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        confirmedAt: {
            type: Date,
            default: undefined,
        },
        releasedAt: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

ReservationSchema.index({ status: 1, expiresAt: 1 });

export const ReservationModel =
    (models.Reservation as Model<ReservationDocument>) ||
    model<ReservationDocument>("Reservation", ReservationSchema);
