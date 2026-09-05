import { CheckoutAddress } from "@shopsphere/types";

export interface TaxCalculationParams {
    subtotalMinor: number;
    currency: string;
    shippingAddress?: CheckoutAddress | undefined;
}

export interface TaxProvider {
    calculateTax(params: TaxCalculationParams): Promise<number>;
}

export class RuleBasedTaxProvider implements TaxProvider {
    async calculateTax(params: TaxCalculationParams): Promise<number> {
        if (!params.shippingAddress) {
            return 0;
        }

        // Rule: 18% GST for India (IN), 8% standard sales tax for US/others
        const rate = params.shippingAddress.country.toUpperCase() === "IN" ? 0.18 : 0.08;
        return Math.round(params.subtotalMinor * rate);
    }
}

export const defaultTaxProvider = new RuleBasedTaxProvider();
