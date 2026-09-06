import { Document, Types } from "mongoose";
import { PaymentProvider, PaymentStatus, PaymentEventStatus } from "@ecommers/types";

export interface IPayment {
    checkoutId: Types.ObjectId;
    orderId?: Types.ObjectId | undefined;
    paymentIntentId: string;
    provider: PaymentProvider;
    amountMinor: number;
    currency: string;
    status: PaymentStatus;
    clientSecret?: string | undefined;
    rawProviderPayload?: unknown | undefined;
    errorMessage?: string | undefined;
    capturedAt?: Date | undefined;
    refundedAt?: Date | undefined;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentDocument extends IPayment, Document<Types.ObjectId> {
}

export interface IPaymentEvent {
    provider: PaymentProvider;
    eventId: string;
    eventType: string;
    paymentIntentId?: string | undefined;
    checkoutId?: string | undefined;
    status: PaymentEventStatus;
    lockedAt?: Date | undefined;
    processedAt?: Date | undefined;
    errorMessage?: string | undefined;
    payload?: unknown | undefined;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentEventDocument extends IPaymentEvent, Document<Types.ObjectId> {
}
