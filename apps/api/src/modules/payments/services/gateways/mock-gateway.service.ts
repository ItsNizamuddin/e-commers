import crypto from "crypto";
import { AppError } from "../../../../utils/app-error.js";
import { env } from "../../../../config/env.js";
import { IPaymentGateway, CreatePaymentIntentParams } from "./payment-gateway.interface.js";
import { WebhookNormalizedEvent } from "@ecommers/types";

export class MockPaymentGateway implements IPaymentGateway {
    readonly providerName = "MOCK" as const;

    async createPaymentIntent(
        params: CreatePaymentIntentParams
    ): Promise<{ paymentIntentId: string; clientSecret: string }> {
        const paymentIntentId = `pi_mock_${crypto.randomBytes(12).toString("hex")}`;
        const clientSecret = `${paymentIntentId}_secret_${crypto.randomBytes(16).toString("hex")}`;
        return { paymentIntentId, clientSecret };
    }

    verifyWebhookSignature(
        rawBody: Buffer,
        signatureHeader: string
    ): WebhookNormalizedEvent {
        if (!signatureHeader) {
            throw new AppError("Missing webhook signature header", 401, "MISSING_SIGNATURE");
        }

        const expectedSignature = crypto
            .createHmac("sha256", env.paymentWebhookSecret)
            .update(rawBody)
            .digest("hex");

        let isMatch = false;
        try {
            const sigBuf = Buffer.from(signatureHeader, "utf-8");
            const expBuf = Buffer.from(expectedSignature, "utf-8");
            if (sigBuf.length === expBuf.length) {
                isMatch = crypto.timingSafeEqual(sigBuf, expBuf);
            }
        } catch {
            isMatch = false;
        }

        if (!isMatch) {
            throw new AppError(
                "Cryptographic HMAC webhook signature mismatch",
                401,
                "INVALID_WEBHOOK_SIGNATURE"
            );
        }

        let parsed: any;
        try {
            parsed = JSON.parse(rawBody.toString("utf-8"));
        } catch {
            throw new AppError("Malformed webhook JSON payload", 400, "MALFORMED_WEBHOOK_PAYLOAD");
        }

        return {
            provider: "MOCK",
            eventId: parsed.id || parsed.eventId || `evt_${crypto.randomBytes(8).toString("hex")}`,
            eventType: parsed.type || parsed.event || parsed.eventType || "payment.unknown",
            paymentIntentId: parsed.paymentIntentId || "",
            checkoutId: parsed.checkoutId || "",
            amountMinor: parsed.amountMinor ?? 0,
            currency: (parsed.currency || "").toUpperCase(),
            payload: parsed,
        };
    }
}

export const mockPaymentGateway = new MockPaymentGateway();
