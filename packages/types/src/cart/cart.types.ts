import type { CartItemResponse } from "./item.types.js";

export type CartStatus = "ACTIVE" | "LOCKED" | "MERGED" | "CONVERTED_TO_ORDER";

export interface CartSummary {
    subtotal: number;
    itemCount: number;
    uniqueItemCount: number;
    currency: string;
}

export interface CartResponse {
    id: string;
    userId?: string | undefined;
    // Note: sessionId is intentionally omitted for privacy and security.
    // The client identifies itself via HttpOnly cookie.
    status: CartStatus;
    currency: string;
    items: CartItemResponse[];
    summary: CartSummary;
    version: number;
    lockedAt?: string | undefined;
    expiresAt: string | null; // null for authenticated user carts, ISO string for guest carts
    createdAt: string;
    updatedAt: string;
}
