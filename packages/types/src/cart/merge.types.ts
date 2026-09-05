import type { CartResponse } from "./cart.types.js";

export interface MergeStockIssue {
    variantId: string;
    sku: string;
    requested: number;
    resulting: number;
    available: number;
    reason: "INSUFFICIENT_STOCK" | "OUT_OF_STOCK" | "VARIANT_INACTIVE" | "PRODUCT_UNPUBLISHED";
}

export interface MergeCartResultResponse {
    cart: CartResponse;
    merged: boolean;
    issues: MergeStockIssue[];
}
