export interface CheckoutItemResponse {
    productId: string;
    variantId: string;
    sku: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    currency: string;
    unitPriceMinor: number;
    lineTotalMinor: number;
    productVersion: number;
    priceCapturedAt: string;
}
