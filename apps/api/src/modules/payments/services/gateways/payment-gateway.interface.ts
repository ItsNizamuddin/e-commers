import type { WebhookNormalizedEvent } from "@ecommers/types";

export interface CreatePaymentIntentParams {
    amountMinor: number;
    currency: string;
    checkoutId: string;
    customerEmail: string;
    idempotencyKey?: string;
    metadata?: Record<string, string>;
}

export interface IPaymentGateway {
    readonly providerName: "STRIPE" | "RAZORPAY" | "MOCK";

    createPaymentIntent(
        params: CreatePaymentIntentParams
    ): Promise<{ paymentIntentId: string; clientSecret: string }>;

    verifyWebhookSignature(
        rawBody: Buffer,
        signatureHeader: string
    ): WebhookNormalizedEvent;

    getPaymentStatus(
        paymentIntentId: string
    ): Promise<{ status: "SUCCEEDED" | "PENDING" | "FAILED"; failureReason?: string }>;

    refundPayment(
        params: { paymentIntentId: string; amountMinor: number; idempotencyKey?: string; reason?: string }
    ): Promise<{ externalRefundId: string; status: "SUCCEEDED" | "PENDING" | "FAILED" }>;
}
