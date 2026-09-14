import crypto from "crypto";
import { ClientSession, Types } from "mongoose";
import { AppError } from "../../../utils/app-error.js";
import { withTransaction } from "../../../database/transaction.js";
import { env } from "../../../config/env.js";
import { OrderDocument } from "../types/order.types.js";
import { orderRepository, OrderRepository } from "../repositories/order.repository.js";
import { paymentRepository, PaymentRepository } from "../../payments/repositories/payment.repository.js";
import { checkoutRepository, CheckoutRepository } from "../../checkout/repositories/checkout.repository.js";
import { checkoutService, CheckoutService } from "../../checkout/services/checkout.service.js";
import { cartRepository, CartRepository } from "../../cart/repositories/cart.repository.js";
import { reservationService, ReservationService } from "../../inventory/services/reservation.service.js";
import { outboxService } from "../../outbox/outbox.service.js";
import { outboxDispatcher } from "../../outbox/outbox.dispatcher.js";

export interface PaymentSuccessHandoffParams {
    paymentId: string;
    paymentIntentId: string;
    checkoutId: string;
    amountMinor: number;
    currency: string;
}

export interface PaymentFailedHandoffParams {
    paymentId?: string | undefined;
    paymentIntentId: string;
    checkoutId: string;
    reason?: string | undefined;
}

export class OrderWorkflowService {
    constructor(
        private readonly orderRepo: OrderRepository = orderRepository,
        private readonly paymentRepo: PaymentRepository = paymentRepository,
        private readonly checkoutRepo: CheckoutRepository = checkoutRepository,
        private readonly checkoutSvc: CheckoutService = checkoutService,
        private readonly cartRepo: CartRepository = cartRepository,
        private readonly resService: ReservationService = reservationService
    ) {}

    generateGuestAccessToken(checkoutId: string, email: string): string {
        const payload = `${checkoutId}:${email}:${Date.now()}`;
        return crypto
            .createHmac("sha256", env.jwtAccessSecret)
            .update(payload)
            .digest("hex");
    }

    async handlePaymentSucceeded(
        params: PaymentSuccessHandoffParams
    ): Promise<OrderDocument> {
        // Idempotency: Check if Order already exists for this checkout
        const existingOrder = await this.orderRepo.findByCheckoutId(params.checkoutId);
        if (existingOrder) {
            return existingOrder;
        }

        const checkout = await this.checkoutRepo.findById(params.checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found for payment handoff", 404, "CHECKOUT_NOT_FOUND");
        }

        // Amount & Currency Verification Guard
        if (params.amountMinor !== checkout.pricing.grandTotalMinor) {
            throw new AppError(
                `Payment amount mismatch. Expected: ${checkout.pricing.grandTotalMinor}, received: ${params.amountMinor}`,
                400,
                "AMOUNT_MISMATCH"
            );
        }

        if (params.currency.toUpperCase() !== checkout.currency.toUpperCase()) {
            throw new AppError(
                `Payment currency mismatch. Expected: ${checkout.currency}, received: ${params.currency}`,
                400,
                "CURRENCY_MISMATCH"
            );
        }

        // Execute Coordinated MongoDB Transaction
        const order = await withTransaction(async (session: ClientSession) => {
            // 1. Verify Payment
            let payment = await this.paymentRepo.findById(params.paymentId, session);
            if (!payment) {
                payment = await this.paymentRepo.findByPaymentIntentId(params.paymentIntentId, session);
            }

            if (payment && payment.status === "CAPTURED") {
                const existing = await this.orderRepo.findByCheckoutId(params.checkoutId, session);
                if (existing) return existing;
            }

            // 2. Generate Collision-Safe Order Number
            const orderNumber = await this.orderRepo.generateCollisionSafeOrderNumber();

            // 3. Prepare Guest Token if Guest Checkout
            const guestAccessToken = checkout.guestSessionId
                ? this.generateGuestAccessToken(checkout._id.toString(), checkout.customerEmailSnapshot)
                : undefined;

            // 4. Create Immutable Order Snapshot
            const newOrder = await this.orderRepo.create(
                {
                    orderNumber,
                    checkoutId: checkout._id,
                    paymentId: payment ? payment._id : new Types.ObjectId(params.paymentId),
                    customerId: checkout.customerId,
                    customerEmailSnapshot: checkout.customerEmailSnapshot,
                    items: checkout.items.map((item) => ({
                        productId: item.productId.toString(),
                        variantId: item.variantId,
                        sku: item.sku,
                        productTitle: item.productTitle,
                        variantTitle: item.variantTitle,
                        quantity: item.quantity,
                        currency: item.currency,
                        unitPriceMinor: item.unitPriceMinor,
                        lineTotalMinor: item.lineTotalMinor,
                    })),
                    shippingAddressSnapshot: checkout.shippingAddressSnapshot!,
                    billingAddressSnapshot: checkout.billingAddressSnapshot || checkout.shippingAddressSnapshot!,
                    pricing: {
                        subtotalMinor: checkout.pricing.subtotalMinor,
                        shippingMinor: checkout.pricing.shippingMinor,
                        taxMinor: checkout.pricing.taxMinor,
                        discountMinor: checkout.pricing.discountMinor,
                        grandTotalMinor: checkout.pricing.grandTotalMinor,
                        currency: checkout.pricing.currency,
                        shippingMethod: "STANDARD",
                    },
                    orderStatus: "CONFIRMED",
                    paymentStatus: "CAPTURED",
                    fulfillmentStatus: "UNFULFILLED",
                    guestAccessToken,
                    placedAt: new Date(),
                    version: 1,
                },
                session
            );

            // 5. Commit Physical Inventory Reservation
            if (checkout.reservationId) {
                await this.resService.commitReservation(
                    checkout.reservationId.toString(),
                    undefined,
                    session
                );
            }

            // 6. Convert Cart to CONVERTED_TO_ORDER
            await this.cartRepo.convertToOrder(checkout.cartId, session);

            // 7. Complete Checkout
            await this.checkoutSvc.completeCheckout(checkout._id, newOrder._id, session);

            // 8. Mark Payment CAPTURED and link Order
            if (payment) {
                await this.paymentRepo.updateStatusWithOCC(
                    payment._id,
                    payment.version,
                    "CAPTURED",
                    {
                        orderId: newOrder._id,
                        capturedAt: new Date(),
                    },
                    session
                );
            }

            // 9. Atomic Transactional Outbox Event for Asynchronous Order Processing
            await outboxService.recordEvent({
                eventType: "ORDER_CONFIRMED",
                aggregateType: "Order",
                aggregateId: newOrder._id,
                deduplicationKey: `order:confirmed:${newOrder.orderNumber}`,
                payload: {
                    orderId: newOrder._id.toString(),
                    orderNumber: newOrder.orderNumber,
                    customerEmail: newOrder.customerEmailSnapshot,
                    invoiceNumber: `INV-${newOrder.orderNumber}`,
                    grandTotalMinor: newOrder.pricing.grandTotalMinor,
                    currency: newOrder.pricing.currency,
                    placedAt: newOrder.placedAt,
                },
                session,
            });

            return newOrder;
        });

        // Trigger asynchronous outbox dispatch immediately
        void outboxDispatcher.triggerImmediate();

        return order;
    }

    async handlePaymentFailed(params: PaymentFailedHandoffParams): Promise<void> {
        let payment = params.paymentId
            ? await this.paymentRepo.findById(params.paymentId)
            : null;
        if (!payment) {
            payment = await this.paymentRepo.findByPaymentIntentId(params.paymentIntentId);
        }

        if (payment && payment.status !== "FAILED") {
            await this.paymentRepo.updateStatusWithOCC(
                payment._id,
                payment.version,
                "FAILED",
                { errorMessage: params.reason || "Payment was declined or cancelled" }
            );
        }

        await this.checkoutSvc.failCheckout(params.checkoutId);
    }
}

export const orderWorkflowService = new OrderWorkflowService();
