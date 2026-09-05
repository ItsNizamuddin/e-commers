import { Document, Types } from "mongoose";
import { CheckoutAddress, CheckoutStatus } from "@shopsphere/types";

export interface ICheckoutItem {
    productId: Types.ObjectId;
    variantId: string;
    sku: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    currency: string;
    unitPriceMinor: number;
    lineTotalMinor: number;
    productVersion: number;
    priceCapturedAt: Date;
}

export interface ICheckoutPricing {
    subtotalMinor: number;
    shippingMinor: number;
    taxMinor: number;
    discountMinor: number;
    grandTotalMinor: number;
    currency: string;
}

export interface ICheckout {
    cartId: Types.ObjectId;
    customerId?: Types.ObjectId | undefined;
    guestSessionId?: string | undefined;
    customerEmailSnapshot: string;
    currency: string;
    status: CheckoutStatus;
    items: ICheckoutItem[];
    pricing: ICheckoutPricing;
    shippingAddressSnapshot?: CheckoutAddress | undefined;
    billingAddressSnapshot?: CheckoutAddress | undefined;
    reservationId?: Types.ObjectId | undefined;
    paymentIntentId?: string | undefined;
    orderId?: Types.ObjectId | undefined;
    idempotencyKey?: string | undefined;
    expiresAt: Date;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CheckoutDocument extends ICheckout, Document {
    _id: Types.ObjectId;
}
