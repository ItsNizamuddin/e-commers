import { Document, Types } from "mongoose";
import {
    AuditActor,
    StockMovementType,
    MovementReferenceType,
} from "@shopsphere/types";

export interface IStockMovement {
    _id: Types.ObjectId;
    inventoryId: Types.ObjectId;
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    warehouseId: Types.ObjectId;
    type: StockMovementType;
    quantityDelta: number;
    previousOnHand: number;
    newOnHand: number;
    previousReserved: number;
    newReserved: number;
    previousBackordered: number;
    newBackordered: number;
    referenceType: MovementReferenceType;
    referenceId: string;
    reason?: string;
    actor?: AuditActor;
    createdAt: Date;
}

export interface StockMovementDocument extends IStockMovement, Document<Types.ObjectId> {}
