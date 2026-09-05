export interface DiscountCalculationParams {
    promoCode?: string | undefined;
    subtotalMinor: number;
    currency: string;
}

export interface DiscountProvider {
    calculateDiscount(params: DiscountCalculationParams): Promise<number>;
}

export class NoDiscountProvider implements DiscountProvider {
    async calculateDiscount(_params: DiscountCalculationParams): Promise<number> {
        // Phase 1: Clean placeholder returning 0 discount
        return 0;
    }
}

export const defaultDiscountProvider = new NoDiscountProvider();
