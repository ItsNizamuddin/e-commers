import crypto from "crypto";
import { AppError } from "../../../../utils/app-error.js";
import { env } from "../../../../config/env.js";
import { IPaymentGateway, CreatePaymentIntentParams } from "./payment-gateway.interface.js";
import { WebhookNormalizedEvent } from "@ecommers/types";

export class StripePaymentGateway implements IPaymentGateway {
    readonly providerName = "STRIPE" as const;

    async createPaymentIntent(
        params: CreatePaymentIntentParams
    ): Promise<{ paymentIntentId: string; clientSecret: string }> {
        const paymentIntentId = `pi_stripe_${crypto.randomBytes(12).toString("hex")}`;
        const clientSecret = `${paymentIntentId}_secret_${crypto.randomBytes(16).toString("hex")}`;
        return { paymentIntentId, clientSecret };
    }

    verifyWebhookSignature(
        rawBody: Buffer,
        signatureHeader: string
    ): WebhookNormalizedEvent {
        if (!signatureHeader) {
            throw new AppError("Missing Stripe-Signature header", 401, "MISSING_SIGNATURE");
        }

        // Parse Stripe signature header (t=timestamp,v1=signature)
        const parts = signatureHeader.split(",");
        const tPart = parts.find((p) => p.startsWith("t="));
        const v1Part = parts.find((p) => p.startsWith("v1="));

        const timestamp = tPart ? tPart.substring(2) : "";
        const signature = v1Part ? v1Part.substring(3) : signatureHeader;

        const payloadToSign = timestamp ? `${timestamp}.${rawBody.toString("utf-8")}` : rawBody;
        const expectedSignature = crypto
            .createHmac("sha256", env.paymentWebhookSecret)
            .update(payloadToSign)
            .digest("hex");

        let isMatch = false;
        try {
            const sigBuf = Buffer.from(signature, "utf-8");
            const expBuf = Buffer.from(expectedSignature, "utf-8");
            if (sigBuf.length === expBuf.length) {
                isMatch = crypto.timingSafeEqual(sigBuf, expBuf);
            }
        } catch {
            isMatch = false;
        }

        if (!isMatch) {
            throw new AppError("Stripe webhook signature verification failed", 401, "INVALID_WEBHOOK_SIGNATURE");
        }

        const parsed = JSON.parse(rawBody.toString("utf-8"));
        const dataObj = parsed.data?.object || parsed;

        return {
            provider: "STRIPE",
            eventId: parsed.id || `evt_${crypto.randomBytes(8).toString("hex")}`,
            eventType: parsed.type || parsed.event,
            paymentIntentId: dataObj.id || dataObj.paymentIntentId || "",
            checkoutId: dataObj.metadata?.checkoutId || dataObj.checkoutId || "",
            amountMinor: dataObj.amount || dataObj.amountMinor || 0,
            currency: (dataObj.currency || "").toUpperCase(),
            payload: parsed,
        };
    }
}

export const stripePaymentGateway = new StripePaymentGateway();
