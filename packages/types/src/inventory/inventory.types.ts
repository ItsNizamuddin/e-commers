import { AuditActor } from "../audit.js";

export interface InventoryResponse {
    id: string;
    productId: string;
    variantId: string;
    warehouseId: string;
    onHand: number;
    reserved: number;
    backordered: number;
    safetyStock: number;
    reorderThreshold: number;
    allowBackorder: boolean;
    available: number; // Derived: max(0, onHand - reserved - safetyStock)
    isLowStock: boolean; // Derived: (onHand - reserved) <= reorderThreshold
    version: number;
    updatedBy?: AuditActor;
    createdAt: string;
    updatedAt: string;
}

export interface PublicVariantAvailabilityResponse {
    productId: string;
    variantId: string;
    isInStock: boolean;
    isLowStock: boolean;
    allowBackorder: boolean;
}

export interface CreateInventoryInput {
    productId: string;
    variantId: string;
    warehouseId?: string;
    onHand?: number;
    safetyStock?: number;
    reorderThreshold?: number;
    allowBackorder?: boolean;
}

export interface UpdateInventoryThresholdsInput {
    expectedVersion: number;
    safetyStock?: number;
    reorderThreshold?: number;
    allowBackorder?: boolean;
}

export interface InventoryQueryOptions {
    page?: number;
    limit?: number;
    productId?: string;
    variantId?: string;
    warehouseId?: string;
    lowStock?: boolean;
}
