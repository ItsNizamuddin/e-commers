import { CheckoutAddress } from "@shopsphere/types";

export interface ShippingCalculationParams {
    itemCount: number;
    subtotalMinor: number;
    currency: string;
    shippingAddress?: CheckoutAddress | undefined;
}

export interface ShippingProvider {
    calculateShipping(params: ShippingCalculationParams): Promise<number>;
}

export class RuleBasedShippingProvider implements ShippingProvider {
    async calculateShipping(params: ShippingCalculationParams): Promise<number> {
        if (!params.shippingAddress) {
            return 0;
        }

        // Free shipping threshold:
        // USD: >= $100.00 (10000 cents) -> Free, else $9.99 (999 cents)
        // INR: >= ₹1000.00 (100000 paise) -> Free, else ₹50.00 (5000 paise)
        // EUR: >= €100.00 (10000 cents) -> Free, else €8.50 (850 cents)
        const curr = params.currency.toUpperCase();
        if (curr === "INR") {
            return params.subtotalMinor >= 100000 ? 0 : 5000;
        }
        if (curr === "EUR") {
            return params.subtotalMinor >= 10000 ? 0 : 850;
        }
        return params.subtotalMinor >= 10000 ? 0 : 999;
    }
}

export const defaultShippingProvider = new RuleBasedShippingProvider();
