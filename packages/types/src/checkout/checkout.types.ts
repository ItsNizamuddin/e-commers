import type { CheckoutAddress } from "./address.types.js";
import type { CheckoutItemResponse } from "./item.types.js";
import type { CheckoutPricingBreakdown } from "./pricing.types.js";

export type CheckoutStatus =
    | "INITIATED"
    | "INVENTORY_RESERVED"
    | "PAYMENT_PENDING"
    | "COMPLETED"
    | "PAYMENT_FAILED"
    | "EXPIRED"
    | "CANCELLED";

export interface CheckoutResponse {
    id: string;
    cartId: string;
    customerId?: string | undefined;
    guestSessionId?: string | undefined;
    customerEmailSnapshot: string;
    currency: string;
    status: CheckoutStatus;
    items: CheckoutItemResponse[];
    pricing: CheckoutPricingBreakdown;
    shippingAddressSnapshot?: CheckoutAddress | undefined;
    billingAddressSnapshot?: CheckoutAddress | undefined;
    reservationId?: string | undefined;
    paymentIntentId?: string | undefined;
    orderId?: string | undefined;
    expiresAt: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface InitCheckoutInput {
    email?: string | undefined;
    shippingAddress?: CheckoutAddress | undefined;
    billingAddress?: CheckoutAddress | undefined;
    promoCode?: string | undefined;
}

export interface UpdateCheckoutAddressesInput {
    shippingAddress?: CheckoutAddress | undefined;
    billingAddress?: CheckoutAddress | undefined;
    expectedVersion: number;
}
