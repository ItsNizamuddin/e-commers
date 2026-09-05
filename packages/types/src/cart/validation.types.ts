export type CartItemAvailabilityStatus =
    | "IN_STOCK"
    | "PARTIALLY_BACKORDERED"
    | "BACKORDERED"
    | "OUT_OF_STOCK";

export interface CartStockIssue {
    variantId: string;
    sku: string;
    requested: number;
    available: number;
    allowBackorder: boolean;
    reason: "INSUFFICIENT_STOCK" | "OUT_OF_STOCK" | "VARIANT_INACTIVE" | "PRODUCT_UNPUBLISHED";
}
