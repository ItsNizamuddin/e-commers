import { Document, Types } from "mongoose";
import { AuditActor } from "@shopsphere/types";

export interface IInventory {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    warehouseId: Types.ObjectId;
    onHand: number;
    reserved: number;
    backordered: number;
    safetyStock: number;
    reorderThreshold: number;
    allowBackorder: boolean;
    version: number;
    updatedBy?: AuditActor;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryDocument extends IInventory, Document<Types.ObjectId> {
    available: number;
    isLowStock: boolean;
}
