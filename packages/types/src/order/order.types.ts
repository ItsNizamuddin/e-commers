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

export interface AllocatedLotReference {
    lotId: string;
    lotNumber: string;
    packagingRunId?: string | undefined;
    warehouseId: string;
    quantity: number;
    allocatedAt: string;
}

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
    allocatedLots?: AllocatedLotReference[] | undefined;
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
    carrier?: string | undefined;
    trackingNumber?: string | undefined;
    expectedVersion: number;
    fulfillmentWarehouseId?: string | undefined;
    itemLotOverrides?: Array<{
        variantId: string;
        lotId: string;
        lotNumber: string;
        quantity: number;
    }> | undefined;
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

export type PackingStatus =
    | "NOT_STARTED"
    | "IN_PROGRESS"
    | "VERIFIED"
    | "CANCELLED";

export type PackingScanResult =
    | "MATCHED"
    | "ALREADY_COMPLETED"
    | "WRONG_LOT"
    | "NOT_FOUND"
    | "EXPIRED"
    | "RECALLED"
    | "QUARANTINED"
    | "INVALID_CODE";

export interface PackingSessionItem {
    orderItemId: string;
    variantId: string;
    productTitle: string;
    variantTitle?: string | undefined;
    lotId: string;
    lotNumber: string;
    requiredQty: number;
    verifiedQty: number;
}

export interface PackingScanEvent {
    eventId: string;
    barcode: string;
    lotId?: string | undefined;
    lotNumber?: string | undefined;
    result: PackingScanResult;
    message: string;
    quantity: number;
    scannedBy?: AuditActor | undefined;
    stationId: string;
    scannedAt: string;
}

export interface PackingSessionResponse {
    id: string;
    orderId: string;
    orderNumber: string;
    status: PackingStatus;
    sessionNumber: number;
    stationId: string;
    startedBy?: AuditActor | undefined;
    startedAt: string;
    completedBy?: AuditActor | undefined;
    completedAt?: string | undefined;
    items: PackingSessionItem[];
    scanEvents: PackingScanEvent[];
    resetReason?: string | undefined;
    resetAt?: string | undefined;
    resetBy?: AuditActor | undefined;
}

export interface StartPackingInput {
    stationId?: string | undefined;
}

export interface PackingScanInput {
    barcode: string;
    stationId?: string | undefined;
}

export interface ResetPackingInput {
    reason: string;
    stationId?: string | undefined;
}

export interface ShipOrderInput {
    expectedVersion: number;
    carrier?: string | undefined;
    trackingNumber?: string | undefined;
    stationId?: string | undefined;
}

