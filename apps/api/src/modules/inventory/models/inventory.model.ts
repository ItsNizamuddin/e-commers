import { Schema, model, models, Model } from "mongoose";
import { AuditActorSchema } from "../../../database/schemas/audit-actor.schema.js";
import { InventoryDocument } from "../types/inventory.types.js";

const InventorySchema = new Schema<InventoryDocument>(
    {
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
            index: true,
        },
        onHand: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        reserved: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        backordered: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        safetyStock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        reorderThreshold: {
            type: Number,
            required: true,
            min: 0,
            default: 10,
        },
        allowBackorder: {
            type: Boolean,
            required: true,
            default: false,
        },
        version: {
            type: Number,
            required: true,
            default: 1,
        },
        updatedBy: {
            type: AuditActorSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Derived virtuals — NOT persisted in MongoDB collection
InventorySchema.virtual("available").get(function (this: InventoryDocument) {
    return Math.max(0, this.onHand - this.reserved - this.safetyStock);
});

InventorySchema.virtual("isLowStock").get(function (this: InventoryDocument) {
    return (this.onHand - this.reserved) <= this.reorderThreshold;
});

// Compound and secondary performance indices
InventorySchema.index({ variantId: 1, warehouseId: 1 }, { unique: true });
InventorySchema.index({ productId: 1, variantId: 1 });
InventorySchema.index({ reorderThreshold: 1, onHand: 1 });

export const InventoryModel =
    (models.Inventory as Model<InventoryDocument>) ||
    model<InventoryDocument>("Inventory", InventorySchema);
