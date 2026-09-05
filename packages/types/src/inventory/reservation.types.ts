export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";

export interface ReservationItem {
    variantId: string;
    warehouseId: string;
    quantity: number;
    reservedPhysical: number;
    backordered: number;
}

export interface ReservationResponse {
    id: string;
    checkoutId: string;
    idempotencyKey?: string;
    status: ReservationStatus;
    items: ReservationItem[];
    expiresAt: string;
    confirmedAt?: string;
    releasedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReservationItemInput {
    variantId: string;
    warehouseId?: string;
    quantity: number;
}

export interface CreateReservationInput {
    checkoutId: string;
    idempotencyKey?: string;
    ttlMinutes?: number;
    items: CreateReservationItemInput[];
}
