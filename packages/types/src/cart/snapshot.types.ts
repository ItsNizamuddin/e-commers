export interface CartPriceSnapshot {
    currency: string;
    amount: number;
    compareAtAmount?: number | undefined;
    capturedAt: string; // ISO 8601 string
}
