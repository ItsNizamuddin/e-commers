export interface PriceDriftIssue {
    variantId: string;
    sku: string;
    cartPrice: number;
    currentPrice: number;
    currency: string;
}

export interface CheckoutPricingBreakdown {
    subtotalMinor: number;
    shippingMinor: number;
    taxMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
    currency: string;
}
