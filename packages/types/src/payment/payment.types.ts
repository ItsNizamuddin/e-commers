export type PaymentProvider = "STRIPE" | "RAZORPAY" | "MOCK";

export type PaymentStatus =
    | "PENDING"
    | "AUTHORIZED"
    | "CAPTURED"
    | "FAILED"
    | "REFUND_REQUESTED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED";

export type PaymentEventStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";

export interface PaymentIntentResult {
    paymentId: string;
    paymentIntentId: string;
    clientSecret: string;
    amountMinor: number;
    currency: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    isExisting?: boolean;
}

export interface PaymentResponse {
    id: string;
    checkoutId: string;
    orderId?: string;
    paymentIntentId: string;
    provider: PaymentProvider;
    amountMinor: number;
    currency: string;
    status: PaymentStatus;
    errorMessage?: string;
    capturedAt?: string;
    refundedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentIntentInput {
    checkoutId: string;
    provider?: PaymentProvider;
    useWallet?: boolean;
}

export interface WebhookNormalizedEvent {
    provider: PaymentProvider;
    eventId: string;
    eventType: string;
    paymentIntentId: string;
    checkoutId: string;
    amountMinor: number;
    currency: string;
    payload: unknown;
}
