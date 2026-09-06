import { WebhookNormalizedEvent } from "@shopsphere/types";

export interface CreatePaymentIntentParams {
    amountMinor: number;
    currency: string;
    checkoutId: string;
    customerEmail: string;
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
}
