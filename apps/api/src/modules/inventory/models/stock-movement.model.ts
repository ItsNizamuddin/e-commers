import { Schema, model, models, Model } from "mongoose";
import { AuditActorSchema } from "../../../database/schemas/audit-actor.schema.js";
import { StockMovementDocument } from "../types/stock-movement.types.js";

const StockMovementSchema = new Schema<StockMovementDocument>(
    {
        inventoryId: {
            type: Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
            index: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        warehouseId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        type: {
            type: String,
            enum: [
                "INVENTORY_ADJUSTMENT",
                "RESERVATION_HOLD",
                "RESERVATION_RELEASE",
                "RESERVATION_COMMIT",
                "STOCK_RECEIPT",
                "DAMAGE_WRITE_OFF",
                "RETURN_RESTOCK",
            ],
            required: true,
            index: true,
        },
        quantityDelta: {
            type: Number,
            required: true,
            default: 0,
        },
        previousOnHand: {
            type: Number,
            required: true,
        },
        newOnHand: {
            type: Number,
            required: true,
        },
        previousReserved: {
            type: Number,
            required: true,
        },
        newReserved: {
            type: Number,
            required: true,
        },
        previousBackordered: {
            type: Number,
            required: true,
            default: 0,
        },
        newBackordered: {
            type: Number,
            required: true,
            default: 0,
        },
        referenceType: {
            type: String,
            enum: ["CHECKOUT", "ORDER", "MANUAL_ADJUSTMENT", "PURCHASE_ORDER", "EXPIRATION_WORKER"],
            required: true,
            index: true,
        },
        referenceId: {
            type: String,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            trim: true,
        },
        actor: {
            type: AuditActorSchema,
            default: undefined,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
            index: true,
        },
    },
    {
        timestamps: false,
        versionKey: false,
    }
);

// Enforce strict ledger immutability at the schema layer
const immutableBlocker = function () {
    throw new Error("StockMovement records are strictly immutable and cannot be updated or deleted.");
};

StockMovementSchema.pre("updateOne", immutableBlocker);
StockMovementSchema.pre("updateMany", immutableBlocker);
StockMovementSchema.pre("findOneAndUpdate", immutableBlocker);
StockMovementSchema.pre("deleteOne", immutableBlocker);
StockMovementSchema.pre("findOneAndDelete", immutableBlocker);
StockMovementSchema.pre("deleteMany", function () {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    throw new Error("StockMovement records are strictly immutable and cannot be updated or deleted.");
});

StockMovementSchema.index({ inventoryId: 1, createdAt: -1 });
StockMovementSchema.index({ variantId: 1, createdAt: -1 });
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const StockMovementModel =
    (models.StockMovement as Model<StockMovementDocument>) ||
    model<StockMovementDocument>("StockMovement", StockMovementSchema);
