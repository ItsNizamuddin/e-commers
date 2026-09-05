import type { CartPriceSnapshot } from "./snapshot.types.js";
import type { CartItemAvailabilityStatus } from "./validation.types.js";

export interface CartItemResponse {
    id: string;
    productId: string;
    variantId: string;
    sku: string;
    title: string;
    thumbnail?: string | undefined;
    priceSnapshot: CartPriceSnapshot;
    quantity: number;
    lineTotal: number;
    attributes?: Record<string, unknown> | undefined;
    availabilityStatus: CartItemAvailabilityStatus;
}

export interface AddToCartInput {
    productId: string;
    variantId: string;
    quantity: number;
    currency?: string | undefined;
    expectedVersion?: number | undefined;
}

export interface UpdateCartItemQuantityInput {
    quantity: number;
    expectedVersion?: number | undefined;
}
