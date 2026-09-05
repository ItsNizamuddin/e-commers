import { AuditActor } from "../audit.js";

export type StockMovementType =
    | "INVENTORY_ADJUSTMENT"
    | "RESERVATION_HOLD"
    | "RESERVATION_RELEASE"
    | "RESERVATION_COMMIT"
    | "STOCK_RECEIPT"
    | "DAMAGE_WRITE_OFF"
    | "RETURN_RESTOCK";

export type MovementReferenceType =
    | "CHECKOUT"
    | "ORDER"
    | "MANUAL_ADJUSTMENT"
    | "PURCHASE_ORDER"
    | "EXPIRATION_WORKER";

export interface StockMovementResponse {
    id: string;
    inventoryId: string;
    productId: string;
    variantId: string;
    warehouseId: string;
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
    createdAt: string;
}

export interface AdjustInventoryInput {
    inventoryId: string;
    delta: number;
    reason: string;
    referenceType?: MovementReferenceType;
    referenceId?: string;
}

export interface StockMovementQueryOptions {
    page?: number;
    limit?: number;
    inventoryId?: string;
    productId?: string;
    variantId?: string;
    type?: StockMovementType;
    referenceId?: string;
}
