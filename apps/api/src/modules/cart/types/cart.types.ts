import { Document, Types } from "mongoose";
import { CartStatus } from "@shopsphere/types";

export interface ICartItemPriceSnapshot {
    currency: string;
    amount: number;
    compareAtAmount?: number | undefined;
    capturedAt: Date;
}

export interface ICartItem {
    _id?: Types.ObjectId | undefined;
    productId: Types.ObjectId;
    variantId: string;
    sku: string;
    title: string;
    thumbnail?: string | undefined;
    priceSnapshot: ICartItemPriceSnapshot;
    quantity: number;
    attributes?: Record<string, unknown> | undefined;
    lineTotal?: number | undefined;
}

export interface ICart {
    userId?: Types.ObjectId | undefined;
    sessionId?: string | undefined;
    status: CartStatus;
    currency: string;
    items: ICartItem[];
    version: number;
    lockedAt?: Date | undefined;
    expiresAt?: Date | null | undefined;
    createdAt: Date;
    updatedAt: Date;
}

export interface CartItemDocument extends ICartItem, Document {
    _id: Types.ObjectId;
    lineTotal: number;
}

export interface CartDocument extends Omit<ICart, "items">, Document {
    _id: Types.ObjectId;
    items: Types.DocumentArray<CartItemDocument>;
    subtotal: number;
    itemCount: number;
    uniqueItemCount: number;
}

export type CartIdentity =
    | { type: "AUTHENTICATED"; userId: string }
    | { type: "GUEST"; sessionId: string };
