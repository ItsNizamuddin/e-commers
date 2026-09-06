import { Document, Types } from "mongoose";
import {
    OrderStatus,
    OrderPaymentStatus,
    OrderFulfillmentStatus,
    OrderItemSnapshot,
    OrderPricingSnapshot,
    OrderAddressSnapshot,
    OrderFulfillmentInfo,
    AuditActor,
} from "@shopsphere/types";

export interface IOrderItem extends OrderItemSnapshot {
    productId: string;
}

export interface IOrder {
    orderNumber: string;
    checkoutId: Types.ObjectId;
    paymentId: Types.ObjectId;
    customerId?: Types.ObjectId | undefined;
    customerEmailSnapshot: string;
    items: IOrderItem[];
    shippingAddressSnapshot: OrderAddressSnapshot;
    billingAddressSnapshot: OrderAddressSnapshot;
    pricing: OrderPricingSnapshot;
    orderStatus: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    fulfillment?: OrderFulfillmentInfo | undefined;
    guestAccessToken?: string | undefined;
    createdBy?: AuditActor | undefined;
    updatedBy?: AuditActor | undefined;
    placedAt: Date;
    cancelledAt?: Date | undefined;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderDocument extends IOrder, Document<Types.ObjectId> {
}
