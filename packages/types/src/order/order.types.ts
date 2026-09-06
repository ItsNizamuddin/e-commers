import { AuditActor } from "../audit.js";
import { CheckoutAddress } from "../checkout/address.types.js";

export type OrderAddressSnapshot = CheckoutAddress;

export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type OrderPaymentStatus =
    | "PENDING"
    | "AUTHORIZED"
    | "CAPTURED"
    | "FAILED"
    | "REFUND_REQUESTED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";

export type OrderFulfillmentStatus =
    | "UNFULFILLED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "RETURNED";

export interface OrderItemSnapshot {
    productId: string;
    variantId: string;
    sku: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    currency: string;
    unitPriceMinor: number;
    lineTotalMinor: number;
}

export interface OrderPricingSnapshot {
    subtotalMinor: number;
    shippingMinor: number;
    taxMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
    currency: string;
    couponCode?: string;
    shippingMethod?: string;
    taxRateBasis?: string;
}

export interface OrderFulfillmentInfo {
    carrier?: string;
    trackingNumber?: string;
    shippedAt?: string;
    deliveredAt?: string;
}

export interface OrderResponse {
    id: string;
    orderNumber: string;
    checkoutId: string;
    paymentId: string;
    customerId?: string;
    customerEmailSnapshot: string;
    items: OrderItemSnapshot[];
    shippingAddressSnapshot: OrderAddressSnapshot;
    billingAddressSnapshot: OrderAddressSnapshot;
    pricing: OrderPricingSnapshot;
    orderStatus: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    fulfillment?: OrderFulfillmentInfo;
    guestAccessToken?: string;
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
    placedAt: string;
    cancelledAt?: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateFulfillmentInput {
    fulfillmentStatus: OrderFulfillmentStatus;
    carrier?: string;
    trackingNumber?: string;
    expectedVersion: number;
}

export interface CancelOrderInput {
    reason?: string;
    expectedVersion?: number;
}

export interface OrderListQuery {
    page?: number;
    limit?: number;
    orderStatus?: OrderStatus;
    paymentStatus?: OrderPaymentStatus;
    fulfillmentStatus?: OrderFulfillmentStatus;
    customerId?: string;
    search?: string;
}
