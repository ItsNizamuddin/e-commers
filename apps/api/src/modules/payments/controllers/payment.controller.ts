import { RequestHandler } from "express";
import { PaymentProvider } from "@ecommers/types";
import { AppError } from "../../../utils/app-error.js";
import { paymentService, PaymentService } from "../services/payment.service.js";
import { resolveCartIdentity } from "../../cart/middleware/cart-identity.middleware.js";

export class PaymentController {
    constructor(private readonly svc: PaymentService = paymentService) {}

    createIntent: RequestHandler = async (req, res, next) => {
        try {
            const identity = resolveCartIdentity(req, res);
            const { checkoutId, provider, useWallet } = req.body;

            const result = await this.svc.createPaymentIntent(
                identity,
                checkoutId,
                provider || "MOCK",
                Boolean(useWallet)
            );

            res.status(result.isExisting ? 200 : 201).json({
                success: true,
                data: result,
            });
        } catch (err) {
            next(err);
        }
    };

    handleWebhook: RequestHandler = async (req, res, next) => {
        try {
            const providerStr = (
                (req.query.provider as string) ||
                (req.headers["x-payment-provider"] as string) ||
                (req.headers["stripe-signature"] ? "STRIPE" : "MOCK")
            ).toUpperCase();

            const provider: PaymentProvider =
                providerStr === "STRIPE"
                    ? "STRIPE"
                    : providerStr === "RAZORPAY"
                    ? "RAZORPAY"
                    : "MOCK";

            const rawBody =
                req.rawBody ||
                (req.body ? Buffer.from(JSON.stringify(req.body), "utf-8") : Buffer.from(""));

            const signatureHeader =
                (req.headers["stripe-signature"] as string) ||
                (req.headers["x-webhook-signature"] as string) ||
                (req.headers["x-payment-signature"] as string) ||
                (req.headers["x-mock-signature"] as string) ||
                "";

            const result = await this.svc.processWebhook(provider, rawBody, signatureHeader);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err) {
            next(err);
        }
    };

    getPaymentById: RequestHandler = async (req, res, next) => {
        try {
            const identity = resolveCartIdentity(req, res);
            const paymentId = String(req.params.id);
            if (!paymentId) {
                throw new AppError("Payment ID is required", 400, "MISSING_ID");
            }

            const payment = await this.svc.getPaymentById(paymentId, identity);

            res.status(200).json({
                success: true,
                data: payment,
            });
        } catch (err) {
            next(err);
        }
    };
}

export const paymentController = new PaymentController();
