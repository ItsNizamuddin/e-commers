import { Types } from "mongoose";
import {
    PaymentProvider,
    PaymentIntentResult,
    PaymentResponse,
} from "@ecommers/types";
import { CartIdentity } from "../../cart/types/cart.types.js";
import { AppError } from "../../../utils/app-error.js";
import { IPaymentGateway, mockPaymentGateway, stripePaymentGateway } from "./gateways/index.js";
import { paymentRepository, PaymentRepository } from "../repositories/payment.repository.js";
import { checkoutRepository, CheckoutRepository } from "../../checkout/repositories/checkout.repository.js";
import { checkoutService, CheckoutService } from "../../checkout/services/checkout.service.js";
import { orderWorkflowService, OrderWorkflowService } from "../../orders/services/order-workflow.service.js";
import { PaymentDocument } from "../types/payment.types.js";
import { WalletTopUpModel } from "../../wallet/models/wallet-topup.model.js";
import { WalletPaymentAllocationModel } from "../../wallet/models/wallet-payment-allocation.model.js";
import { walletService } from "../../wallet/wallet.service.js";
import { withTransaction } from "../../../database/transaction.js";

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
        provider: PaymentProvider = "MOCK",
        useWallet: boolean = false
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

        const grandTotalMinor = checkout.pricing.grandTotalMinor;

        // --- Wallet Payment Processing (Full or Split) ---
        if (useWallet && identity.type === "AUTHENTICATED") {
            const wallet = await walletService.getOrCreateWallet(identity.userId);

            // 1. Full-Wallet Checkout: Single MongoDB Transaction Boundary
            if (wallet.status === "ACTIVE" && wallet.balanceMinor >= grandTotalMinor) {
                return await withTransaction(async (session) => {
                    const deb = await walletService.debitWallet({
                        userId: identity.userId,
                        amountMinor: grandTotalMinor,
                        purpose: "ORDER_PAYMENT",
                        referenceType: "CHECKOUT",
                        referenceId: checkoutId,
                        idempotencyKey: `wallet_pay_${checkoutId}`,
                        createdBy: "CUSTOMER",
                        session,
                    });

                    const allocation = new WalletPaymentAllocationModel({
                        checkoutId: checkout._id,
                        walletId: wallet._id,
                        userId: new Types.ObjectId(identity.userId),
                        provider: "MOCK",
                        walletAmountMinor: grandTotalMinor,
                        externalAmountMinor: 0,
                        totalAmountMinor: grandTotalMinor,
                        status: "COMPLETED",
                        walletTransactionId: deb.transaction._id,
                        gatewayIdempotencyKey: `full_wallet_${checkoutId}`,
                        idempotencyKey: `alloc_${checkoutId}`,
                    });
                    await allocation.save({ session });

                    await this.checkoutSvc.markPaymentPending(
                        checkoutId,
                        `wallet_${deb.transaction._id.toString()}`
                    );

                    const order = await this.workflowSvc.handlePaymentSucceeded({
                        paymentId: new Types.ObjectId().toString(),
                        paymentIntentId: `wallet_${deb.transaction.transactionId}`,
                        checkoutId,
                        amountMinor: grandTotalMinor,
                        currency: checkout.currency,
                    });

                    allocation.orderId = order._id;
                    await allocation.save({ session });

                    return {
                        paymentId: `wlt_${deb.transaction._id.toString()}`,
                        paymentIntentId: `wallet_${deb.transaction.transactionId}`,
                        clientSecret: "FULL_WALLET_PAYMENT",
                        amountMinor: grandTotalMinor,
                        currency: checkout.currency,
                        provider: "MOCK",
                        status: "CAPTURED",
                        isExisting: false,
                    };
                });
            }

            // 2. Split Payment Saga: Wallet (< total) + External Gateway (remainder)
            if (wallet.status === "ACTIVE" && wallet.balanceMinor > 0 && wallet.balanceMinor < grandTotalMinor) {
                const walletAmountMinor = wallet.balanceMinor;
                const externalAmountMinor = grandTotalMinor - walletAmountMinor;

                const allocationId = new Types.ObjectId();
                const gatewayIdempotencyKey = `gw_${allocationId.toString()}`;

                const allocation = await withTransaction(async (session) => {
                    const deb = await walletService.debitWallet({
                        userId: identity.userId,
                        amountMinor: walletAmountMinor,
                        purpose: "ORDER_PAYMENT",
                        referenceType: "CHECKOUT",
                        referenceId: checkoutId,
                        idempotencyKey: `wallet_split_${checkoutId}`,
                        createdBy: "CUSTOMER",
                        session,
                    });

                    const alloc = new WalletPaymentAllocationModel({
                        _id: allocationId,
                        checkoutId: checkout._id,
                        walletId: wallet._id,
                        userId: new Types.ObjectId(identity.userId),
                        provider,
                        walletAmountMinor,
                        externalAmountMinor,
                        totalAmountMinor: grandTotalMinor,
                        status: "PENDING",
                        walletTransactionId: deb.transaction._id,
                        gatewayIdempotencyKey,
                        idempotencyKey: `alloc_${checkoutId}`,
                    });
                    await alloc.save({ session });
                    return alloc;
                });

                const gateway = this.getGateway(provider);
                const { paymentIntentId, clientSecret } = await gateway.createPaymentIntent({
                    amountMinor: externalAmountMinor,
                    currency: checkout.currency,
                    checkoutId: checkout._id.toString(),
                    customerEmail: checkout.customerEmailSnapshot,
                    idempotencyKey: gatewayIdempotencyKey,
                    metadata: {
                        checkoutId: checkout._id.toString(),
                        allocationId: allocation._id.toString(),
                    },
                });

                allocation.externalPaymentId = paymentIntentId;
                await allocation.save();

                await this.checkoutSvc.markPaymentPending(checkoutId, paymentIntentId);

                const payment = await this.repo.create({
                    checkoutId: checkout._id,
                    paymentIntentId,
                    provider,
                    amountMinor: externalAmountMinor,
                    currency: checkout.currency,
                    status: "PENDING",
                    clientSecret,
                    version: 1,
                });

                return {
                    paymentId: payment._id.toString(),
                    paymentIntentId,
                    clientSecret,
                    amountMinor: externalAmountMinor,
                    currency: checkout.currency,
                    provider,
                    status: payment.status,
                    isExisting: false,
                };
            }
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
                    isExisting: true,
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
            paymentIntentId: payment.paymentIntentId,
            clientSecret,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            provider: payment.provider,
            status: payment.status,
            isExisting: false,
        };
    }

    async processWebhook(
        provider: PaymentProvider,
        rawBody: Buffer,
        signatureHeader: string
    ): Promise<{ status: "PROCESSED" | "ALREADY_PROCESSED"; eventId: string }> {
        const gateway = this.getGateway(provider);

        // 1. Cryptographic Signature Verification (throws 400 if invalid)
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
            return { status: "ALREADY_PROCESSED", eventId: event.eventId };
        }

        if (!acquired) {
            throw new AppError("Concurrent webhook in progress", 409, "CONCURRENT_WEBHOOK");
        }

        try {
            // 3a. Handle Wallet Top-Up Webhook if matched
            const topUp = await WalletTopUpModel.findOne({
                provider,
                providerPaymentId: event.paymentIntentId,
            });

            if (topUp) {
                if (
                    event.eventType === "payment.succeeded" ||
                    event.eventType === "payment_intent.succeeded"
                ) {
                    if (topUp.status !== "SUCCESS") {
                        await withTransaction(async (session) => {
                            await walletService.creditWallet({
                                userId: topUp.userId.toString(),
                                amountMinor: topUp.amountMinor,
                                purpose: "TOP_UP",
                                referenceType: "TOPUP",
                                referenceId: topUp._id.toString(),
                                idempotencyKey: `topup_credit_${topUp._id.toString()}`,
                                createdBy: "WEBHOOK",
                                metadata: {
                                    provider,
                                    providerPaymentId: event.paymentIntentId,
                                },
                                session,
                            });

                            topUp.status = "SUCCESS";
                            topUp.completedAt = new Date();
                            await topUp.save({ session });
                        });
                    }
                } else if (
                    event.eventType === "payment.failed" ||
                    event.eventType === "payment_intent.payment_failed"
                ) {
                    if (topUp.status !== "SUCCESS") {
                        topUp.status = "FAILED";
                        topUp.failureReason = "Payment declined by provider";
                        await topUp.save();
                    }
                }

                await this.repo.markEventProcessed(provider, event.eventId);
                return { status: "PROCESSED", eventId: event.eventId };
            }

            // 3b. Handle Split Payment Allocation Webhook if matched
            const allocation = await WalletPaymentAllocationModel.findOne({
                provider,
                externalPaymentId: event.paymentIntentId,
            });

            if (allocation) {
                if (
                    event.eventType === "payment.succeeded" ||
                    event.eventType === "payment_intent.succeeded"
                ) {
                    if (allocation.status !== "COMPLETED") {
                        allocation.status = "COMPLETED";
                        await allocation.save();

                        await this.workflowSvc.handlePaymentSucceeded({
                            paymentId: new Types.ObjectId().toString(),
                            paymentIntentId: event.paymentIntentId,
                            checkoutId: allocation.checkoutId.toString(),
                            amountMinor: allocation.totalAmountMinor,
                            currency: event.currency || "INR",
                        });
                    }
                } else if (
                    event.eventType === "payment.failed" ||
                    event.eventType === "payment_intent.payment_failed"
                ) {
                    if (allocation.status === "PENDING") {
                        // Saga compensating transaction: reverse wallet debit
                        await withTransaction(async (session) => {
                            if (allocation.walletAmountMinor > 0) {
                                const rev = await walletService.creditWallet({
                                    userId: allocation.userId.toString(),
                                    amountMinor: allocation.walletAmountMinor,
                                    purpose: "PAYMENT_REVERSAL",
                                    referenceType: "CHECKOUT",
                                    referenceId: allocation.checkoutId.toString(),
                                    idempotencyKey: `reversal_${allocation._id.toString()}`,
                                    createdBy: "WEBHOOK",
                                    metadata: {
                                        reason: "Gateway payment failed; automated reversal",
                                    },
                                    session,
                                });
                                allocation.reversalTransactionId = rev.transaction._id;
                            }
                            allocation.status = "REVERSED";
                            await allocation.save({ session });
                        });

                        await this.workflowSvc.handlePaymentFailed({
                            paymentId: undefined,
                            paymentIntentId: event.paymentIntentId,
                            checkoutId: allocation.checkoutId.toString(),
                            reason: "Gateway payment failed; wallet funds reversed",
                        });
                    }
                }

                await this.repo.markEventProcessed(provider, event.eventId);
                return { status: "PROCESSED", eventId: event.eventId };
            }

            // 3c. Resolve internal checkout payment record
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
                const payloadObj = event.payload as any;
                const failureReason =
                    payloadObj?.payload?.reason ||
                    payloadObj?.reason ||
                    payloadObj?.data?.object?.last_payment_error?.message ||
                    "Payment declined";

                await this.workflowSvc.handlePaymentFailed({
                    paymentId: payment ? payment._id.toString() : undefined,
                    paymentIntentId: event.paymentIntentId,
                    checkoutId: targetCheckoutId,
                    reason: failureReason,
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
