import { Types } from "mongoose";
import {
    PaymentProvider,
    PaymentIntentResult,
    PaymentResponse,
} from "@shopsphere/types";
import { CartIdentity } from "../../cart/types/cart.types.js";
import { AppError } from "../../../utils/app-error.js";
import { IPaymentGateway, mockPaymentGateway, stripePaymentGateway } from "./gateways/index.js";
import { paymentRepository, PaymentRepository } from "../repositories/payment.repository.js";
import { checkoutRepository, CheckoutRepository } from "../../checkout/repositories/checkout.repository.js";
import { checkoutService, CheckoutService } from "../../checkout/services/checkout.service.js";
import { orderWorkflowService, OrderWorkflowService } from "../../orders/services/order-workflow.service.js";
import { PaymentDocument } from "../types/payment.types.js";

export class PaymentService {
    private readonly gateways: Map<PaymentProvider, IPaymentGateway>;

    constructor(
        private readonly repo: PaymentRepository = paymentRepository,
        private readonly checkoutRepo: CheckoutRepository = checkoutRepository,
        private readonly checkoutSvc: CheckoutService = checkoutService,
        private readonly workflowSvc: OrderWorkflowService = orderWorkflowService
    ) {
        this.gateways = new Map<PaymentProvider, IPaymentGateway>([
            ["MOCK", mockPaymentGateway],
            ["STRIPE", stripePaymentGateway],
        ]);
    }

    private getGateway(provider: PaymentProvider = "MOCK"): IPaymentGateway {
        const gw = this.gateways.get(provider);
        if (!gw) {
            throw new AppError(`Unsupported payment provider '${provider}'`, 400, "UNSUPPORTED_PROVIDER");
        }
        return gw;
    }

    mapPaymentToResponse(doc: PaymentDocument): PaymentResponse {
        return {
            id: doc._id.toString(),
            checkoutId: doc.checkoutId.toString(),
            ...(doc.orderId ? { orderId: doc.orderId.toString() } : {}),
            paymentIntentId: doc.paymentIntentId,
            provider: doc.provider,
            amountMinor: doc.amountMinor,
            currency: doc.currency,
            status: doc.status,
            ...(doc.errorMessage ? { errorMessage: doc.errorMessage } : {}),
            ...(doc.capturedAt ? { capturedAt: doc.capturedAt.toISOString() } : {}),
            ...(doc.refundedAt ? { refundedAt: doc.refundedAt.toISOString() } : {}),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    async createPaymentIntent(
        identity: CartIdentity,
        checkoutId: string,
        provider: PaymentProvider = "MOCK"
    ): Promise<PaymentIntentResult> {
        const checkout = await this.checkoutRepo.findById(checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        // Verify Identity Ownership
        if (identity.type === "AUTHENTICATED") {
            if (checkout.customerId?.toString() !== identity.userId) {
                throw new AppError("You do not own this checkout", 403, "FORBIDDEN");
            }
        } else {
            if (checkout.guestSessionId !== identity.sessionId) {
                throw new AppError("Guest session does not match checkout", 403, "FORBIDDEN");
            }
        }

        // Must have shipping address before payment intent
        if (!checkout.shippingAddressSnapshot) {
            throw new AppError(
                "Shipping address must be provided before initiating payment",
                400,
                "ADDRESS_REQUIRED"
            );
        }

        // If already completed or cancelled, reject
        if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(checkout.status)) {
            throw new AppError(
                `Cannot create payment intent for checkout in '${checkout.status}' state`,
                400,
                "INVALID_CHECKOUT_STATUS"
            );
        }

        // Check if an existing PENDING payment intent exists for this checkout (idempotent reuse)
        const existingPayment = await this.repo.findByCheckoutId(checkout._id);
        if (existingPayment && existingPayment.status === "PENDING") {
            // Re-fetch with secret
            const withSecret = await this.repo.findById(existingPayment._id);
            if (withSecret) {
                return {
                    paymentId: existingPayment._id.toString(),
                    paymentIntentId: existingPayment.paymentIntentId,
                    clientSecret: withSecret.clientSecret || `${existingPayment.paymentIntentId}_secret_mock`,
                    amountMinor: existingPayment.amountMinor,
                    currency: existingPayment.currency,
                    provider: existingPayment.provider,
                    status: existingPayment.status,
                };
            }
        }

        const gateway = this.getGateway(provider);

        // 1. Create gateway intent
        const { paymentIntentId, clientSecret } = await gateway.createPaymentIntent({
            amountMinor: checkout.pricing.grandTotalMinor,
            currency: checkout.currency,
            checkoutId: checkout._id.toString(),
            customerEmail: checkout.customerEmailSnapshot,
            metadata: {
                checkoutId: checkout._id.toString(),
            },
        });

        // 2. Transition Checkout to PAYMENT_PENDING (locks address modifications!)
        await this.checkoutSvc.markPaymentPending(checkoutId, paymentIntentId);

        // 3. Persist local Payment record
        const payment = await this.repo.create({
            checkoutId: checkout._id,
            paymentIntentId,
            provider,
            amountMinor: checkout.pricing.grandTotalMinor,
            currency: checkout.currency,
            status: "PENDING",
            clientSecret,
            version: 1,
        });

        return {
            paymentId: payment._id.toString(),
            paymentIntentId,
            clientSecret,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            provider,
            status: "PENDING",
        };
    }

    async processWebhook(
        provider: PaymentProvider,
        rawBody: Buffer,
        signatureHeader: string
    ): Promise<{ status: "PROCESSED" | "DUPLICATE"; eventId: string }> {
        const gateway = this.getGateway(provider);

        // 1. Cryptographic Signature Verification (throws 401 if invalid)
        const event = gateway.verifyWebhookSignature(rawBody, signatureHeader);

        // 2. Four-State Event Deduplication
        const { acquired, alreadyProcessed } = await this.repo.acquireEventLock(
            provider,
            event.eventId,
            event.eventType,
            {
                paymentIntentId: event.paymentIntentId,
                checkoutId: event.checkoutId,
                payload: event.payload,
            }
        );

        if (alreadyProcessed) {
            return { status: "DUPLICATE", eventId: event.eventId };
        }

        if (!acquired) {
            throw new AppError("Concurrent webhook in progress", 409, "CONCURRENT_WEBHOOK");
        }

        try {
            // 3. Resolve internal payment record
            let payment = event.paymentIntentId
                ? await this.repo.findByPaymentIntentId(event.paymentIntentId)
                : null;

            const targetCheckoutId = event.checkoutId || (payment ? payment.checkoutId.toString() : "");

            // 4. Dispatch Event
            if (
                event.eventType === "payment.succeeded" ||
                event.eventType === "payment_intent.succeeded"
            ) {
                await this.workflowSvc.handlePaymentSucceeded({
                    paymentId: payment ? payment._id.toString() : new Types.ObjectId().toString(),
                    paymentIntentId: event.paymentIntentId,
                    checkoutId: targetCheckoutId,
                    amountMinor: event.amountMinor,
                    currency: event.currency,
                });
            } else if (
                event.eventType === "payment.failed" ||
                event.eventType === "payment_intent.payment_failed"
            ) {
                await this.workflowSvc.handlePaymentFailed({
                    paymentId: payment ? payment._id.toString() : undefined,
                    paymentIntentId: event.paymentIntentId,
                    checkoutId: targetCheckoutId,
                    reason: (event.payload as any)?.reason || "Payment declined",
                });
            }

            // 5. Mark event as PROCESSED in ledger
            await this.repo.markEventProcessed(provider, event.eventId);
            return { status: "PROCESSED", eventId: event.eventId };
        } catch (err: any) {
            await this.repo.markEventFailed(provider, event.eventId, err.message || "Execution error");
            throw err;
        }
    }

    async getPaymentById(
        paymentId: string,
        identity: CartIdentity
    ): Promise<PaymentResponse> {
        const payment = await this.repo.findById(paymentId);
        if (!payment) {
            throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
        }

        const checkout = await this.checkoutRepo.findById(payment.checkoutId);
        if (checkout) {
            if (identity.type === "AUTHENTICATED") {
                if (checkout.customerId?.toString() !== identity.userId) {
                    throw new AppError("Access denied to this payment", 403, "FORBIDDEN");
                }
            } else {
                if (checkout.guestSessionId !== identity.sessionId) {
                    throw new AppError("Access denied to this payment", 403, "FORBIDDEN");
                }
            }
        }

        return this.mapPaymentToResponse(payment);
    }
}

export const paymentService = new PaymentService();
