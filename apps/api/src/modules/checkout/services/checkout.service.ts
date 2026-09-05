import { Types } from "mongoose";
import {
    CheckoutResponse,
    InitCheckoutInput,
    PriceDriftIssue,
    UpdateCheckoutAddressesInput,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { withTransaction } from "../../../database/transaction.js";
import { UserModel } from "../../users/user.model.js";
import { ProductModel } from "../../products/product.model.js";
import {
    reservationService,
    ReservationService,
} from "../../inventory/services/reservation.service.js";
import {
    cartRepository,
    CartRepository,
} from "../../cart/repositories/cart.repository.js";
import { CartIdentity } from "../../cart/types/cart.types.js";
import {
    checkoutRepository,
    CheckoutRepository,
} from "../repositories/checkout.repository.js";
import {
    defaultTaxProvider,
    TaxProvider,
    defaultShippingProvider,
    ShippingProvider,
    defaultDiscountProvider,
    DiscountProvider,
} from "./providers/index.js";
import {
    CheckoutDocument,
    ICheckoutItem,
    ICheckoutPricing,
} from "../types/checkout.types.js";

export class CheckoutService {
    constructor(
        private readonly repo: CheckoutRepository = checkoutRepository,
        private readonly cartRepo: CartRepository = cartRepository,
        private readonly resService: ReservationService = reservationService,
        private readonly taxProvider: TaxProvider = defaultTaxProvider,
        private readonly shippingProvider: ShippingProvider = defaultShippingProvider,
        private readonly discountProvider: DiscountProvider = defaultDiscountProvider
    ) {}

    /* -------------------------------------------------------------------------- */
    /* Mapping Helpers                                                            */
    /* -------------------------------------------------------------------------- */

    mapCheckoutToResponse(doc: CheckoutDocument): CheckoutResponse {
        return {
            id: doc._id.toString(),
            cartId: doc.cartId.toString(),
            ...(doc.customerId ? { customerId: doc.customerId.toString() } : {}),
            ...(doc.guestSessionId ? { guestSessionId: doc.guestSessionId } : {}),
            customerEmailSnapshot: doc.customerEmailSnapshot,
            currency: doc.currency,
            status: doc.status,
            items: doc.items.map((item) => ({
                productId: item.productId.toString(),
                variantId: item.variantId,
                sku: item.sku,
                productTitle: item.productTitle,
                variantTitle: item.variantTitle,
                quantity: item.quantity,
                currency: item.currency,
                unitPriceMinor: item.unitPriceMinor,
                lineTotalMinor: item.lineTotalMinor,
                productVersion: item.productVersion,
                priceCapturedAt: item.priceCapturedAt.toISOString(),
            })),
            pricing: {
                subtotalMinor: doc.pricing.subtotalMinor,
                shippingMinor: doc.pricing.shippingMinor,
                taxMinor: doc.pricing.taxMinor,
                discountMinor: doc.pricing.discountMinor,
                grandTotalMinor: doc.pricing.grandTotalMinor,
                currency: doc.pricing.currency,
            },
            ...(doc.shippingAddressSnapshot
                ? { shippingAddressSnapshot: doc.shippingAddressSnapshot }
                : {}),
            ...(doc.billingAddressSnapshot
                ? { billingAddressSnapshot: doc.billingAddressSnapshot }
                : {}),
            ...(doc.reservationId ? { reservationId: doc.reservationId.toString() } : {}),
            ...(doc.paymentIntentId ? { paymentIntentId: doc.paymentIntentId } : {}),
            ...(doc.orderId ? { orderId: doc.orderId.toString() } : {}),
            expiresAt: doc.expiresAt.toISOString(),
            version: doc.version,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    /* -------------------------------------------------------------------------- */
    /* Initiate Checkout                                                          */
    /* -------------------------------------------------------------------------- */

    async initiateCheckout(
        identity: CartIdentity,
        input: InitCheckoutInput,
        idempotencyKey?: string
    ): Promise<CheckoutResponse> {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const existing = await this.repo.findByIdempotencyKey(idempotencyKey);
            if (
                existing &&
                ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"].includes(existing.status)
            ) {
                return this.mapCheckoutToResponse(existing);
            }
        }

        // 2. Resolve Active Cart
        const cart = await this.cartRepo.findActiveByIdentity(identity);
        if (!cart || cart.items.length === 0) {
            throw new AppError("Cannot initiate checkout with an empty cart", 400, "EMPTY_CART");
        }

        if (cart.status === "LOCKED") {
            const activeCheckout = await this.repo.findActiveByCartId(cart._id);
            if (activeCheckout) {
                return this.mapCheckoutToResponse(activeCheckout);
            }
            throw new AppError(
                "Cart is currently locked for checkout",
                409,
                "CART_LOCKED"
            );
        }

        if (cart.status !== "ACTIVE") {
            throw new AppError(
                `Cannot initiate checkout on cart with status '${cart.status}'`,
                400,
                "INVALID_CART_STATUS"
            );
        }

        // 3. Resolve Customer Email Snapshot
        let customerEmailSnapshot = "";
        if (identity.type === "AUTHENTICATED") {
            const user = await UserModel.findById(identity.userId);
            customerEmailSnapshot = input.email || user?.email || "";
            if (!customerEmailSnapshot) {
                throw new AppError("Customer email is required for checkout", 400, "EMAIL_REQUIRED");
            }
        } else {
            if (!input.email || !input.email.includes("@")) {
                throw new AppError(
                    "A valid email address is required for guest checkout",
                    400,
                    "EMAIL_REQUIRED"
                );
            }
            customerEmailSnapshot = input.email.trim().toLowerCase();
        }

        // 4. Pre-Validation & Price Drift Detection (Before Transaction)
        const priceDriftIssues: PriceDriftIssue[] = [];
        const checkoutItems: ICheckoutItem[] = [];
        let subtotalMinor = 0;

        for (const item of cart.items) {
            const product = await ProductModel.findById(item.productId);
            if (!product) {
                throw new AppError(`Product '${item.sku}' not found`, 404, "PRODUCT_NOT_FOUND");
            }
            if (product.status !== "PUBLISHED") {
                throw new AppError(
                    `Product '${product.title}' is not published for purchase`,
                    400,
                    "PRODUCT_NOT_PUBLISHED"
                );
            }

            const variant = product.variants.find(
                (v) => v.id === item.variantId || (v as any)._id?.toString() === item.variantId
            );
            if (!variant) {
                throw new AppError(`Variant '${item.sku}' not found`, 404, "VARIANT_NOT_FOUND");
            }
            if (variant.isActive === false) {
                throw new AppError(`Variant '${variant.sku}' is currently inactive`, 400, "VARIANT_INACTIVE");
            }

            const livePrice = variant.prices.find(
                (p) => p.currency.toUpperCase() === cart.currency.toUpperCase()
            );
            if (!livePrice) {
                throw new AppError(
                    `Variant '${variant.sku}' does not support currency '${cart.currency}'`,
                    400,
                    "CURRENCY_UNAVAILABLE"
                );
            }

            // Check Price Drift
            if (Math.abs(item.priceSnapshot.amount - livePrice.amount) > 0.001) {
                priceDriftIssues.push({
                    variantId: item.variantId,
                    sku: item.sku,
                    cartPrice: item.priceSnapshot.amount,
                    currentPrice: livePrice.amount,
                    currency: cart.currency,
                });
            }

            const unitPriceMinor = Math.round(livePrice.amount * 100);
            const lineTotalMinor = unitPriceMinor * item.quantity;
            subtotalMinor += lineTotalMinor;

            checkoutItems.push({
                productId: product._id as Types.ObjectId,
                variantId: item.variantId,
                sku: variant.sku,
                productTitle: product.title,
                variantTitle: variant.title,
                quantity: item.quantity,
                currency: cart.currency.toUpperCase(),
                unitPriceMinor,
                lineTotalMinor,
                productVersion: product.version || 1,
                priceCapturedAt: new Date(),
            });
        }

        // If price drift is detected, abort before touching database or stock
        if (priceDriftIssues.length > 0) {
            throw new AppError(
                "One or more item prices have changed since being added to your cart",
                409,
                "PRICE_CHANGED",
                { changes: priceDriftIssues }
            );
        }

        // 5. Calculate Financial Totals in Minor Units
        const taxMinor = await this.taxProvider.calculateTax({
            subtotalMinor,
            currency: cart.currency,
            shippingAddress: input.shippingAddress,
        });

        const shippingMinor = await this.shippingProvider.calculateShipping({
            itemCount: cart.itemCount,
            subtotalMinor,
            currency: cart.currency,
            shippingAddress: input.shippingAddress,
        });

        const discountMinor = await this.discountProvider.calculateDiscount({
            promoCode: input.promoCode,
            subtotalMinor,
            currency: cart.currency,
        });

        const grandTotalMinor = Math.max(
            0,
            subtotalMinor + shippingMinor + taxMinor - discountMinor
        );

        const pricing: ICheckoutPricing = {
            subtotalMinor,
            shippingMinor,
            taxMinor,
            discountMinor,
            grandTotalMinor,
            currency: cart.currency.toUpperCase(),
        };

        // 6. Single Atomic MongoDB Transaction (Lock Cart, Reserve Stock, Create Checkout)
        const checkoutId = new Types.ObjectId();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute reservation window

        const createdCheckout = await withTransaction(async (session) => {
            // A. Lock Cart
            await this.cartRepo.lockCart(cart._id, session);

            // B. Authoritative Inventory Reservation (Passes caller's session!)
            const reservation = await this.resService.reserveStock(
                {
                    checkoutId: checkoutId.toString(),
                    ...(idempotencyKey ? { idempotencyKey: `res_${idempotencyKey}` } : {}),
                    items: cart.items.map((i) => ({
                        variantId: i.variantId,
                        quantity: i.quantity,
                    })),
                    ttlMinutes: 15,
                },
                undefined,
                session
            );

            // C. Persist Checkout Document
            const checkoutDoc = await this.repo.createCheckout(
                {
                    cartId: cart._id,
                    ...(identity.type === "AUTHENTICATED"
                        ? { customerId: new Types.ObjectId(identity.userId) }
                        : { guestSessionId: identity.sessionId }),
                    customerEmailSnapshot,
                    currency: cart.currency.toUpperCase(),
                    status: "INVENTORY_RESERVED",
                    items: checkoutItems,
                    pricing,
                    ...(input.shippingAddress
                        ? { shippingAddressSnapshot: input.shippingAddress }
                        : {}),
                    ...(input.billingAddress
                        ? { billingAddressSnapshot: input.billingAddress }
                        : {}),
                    reservationId: new Types.ObjectId(reservation.id),
                    ...(idempotencyKey ? { idempotencyKey } : {}),
                    expiresAt,
                },
                session
            );

            return checkoutDoc;
        });

        return this.mapCheckoutToResponse(createdCheckout);
    }

    /* -------------------------------------------------------------------------- */
    /* Read Checkout                                                              */
    /* -------------------------------------------------------------------------- */

    async getCheckoutById(
        identity: CartIdentity,
        checkoutId: string
    ): Promise<CheckoutResponse> {
        const checkout = await this.repo.findById(checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        // Ownership Check
        if (identity.type === "AUTHENTICATED") {
            if (checkout.customerId?.toString() !== identity.userId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        } else {
            if (checkout.guestSessionId !== identity.sessionId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        }

        // If checkout is expired, trigger cleanup
        if (
            checkout.status === "EXPIRED" ||
            (checkout.expiresAt && checkout.expiresAt.getTime() < Date.now())
        ) {
            if (checkout.reservationId) {
                await this.resService.releaseReservation(checkout.reservationId.toString());
            }
            await this.cartRepo.unlockCart(checkout.cartId);
        }

        return this.mapCheckoutToResponse(checkout);
    }

    /* -------------------------------------------------------------------------- */
    /* Address Mutation & Totals Recalculation                                     */
    /* -------------------------------------------------------------------------- */

    async updateAddresses(
        identity: CartIdentity,
        checkoutId: string,
        input: UpdateCheckoutAddressesInput
    ): Promise<CheckoutResponse> {
        const checkout = await this.repo.findById(checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        if (identity.type === "AUTHENTICATED") {
            if (checkout.customerId?.toString() !== identity.userId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        } else {
            if (checkout.guestSessionId !== identity.sessionId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        }

        if (!["INITIATED", "INVENTORY_RESERVED"].includes(checkout.status)) {
            throw new AppError(
                `Cannot modify addresses when checkout is in '${checkout.status}' state. Addresses are locked once payment is initiated or completed.`,
                409,
                "STATE_LOCKED"
            );
        }

        // Recalculate Tax & Shipping based on updated shipping address
        const shippingAddress = input.shippingAddress || checkout.shippingAddressSnapshot;
        const subtotalMinor = checkout.pricing.subtotalMinor;

        const taxMinor = await this.taxProvider.calculateTax({
            subtotalMinor,
            currency: checkout.currency,
            shippingAddress,
        });

        const shippingMinor = await this.shippingProvider.calculateShipping({
            itemCount: checkout.items.reduce((sum, i) => sum + i.quantity, 0),
            subtotalMinor,
            currency: checkout.currency,
            shippingAddress,
        });

        const grandTotalMinor = Math.max(
            0,
            subtotalMinor + shippingMinor + taxMinor - checkout.pricing.discountMinor
        );

        const newPricing: ICheckoutPricing = {
            subtotalMinor,
            shippingMinor,
            taxMinor,
            discountMinor: checkout.pricing.discountMinor,
            grandTotalMinor,
            currency: checkout.currency,
        };

        const updated = await this.repo.updateAddressesAndPricing(
            checkoutId,
            input.shippingAddress,
            input.billingAddress,
            newPricing,
            input.expectedVersion
        );

        return this.mapCheckoutToResponse(updated);
    }

    /* -------------------------------------------------------------------------- */
    /* Customer Cancellation                                                      */
    /* -------------------------------------------------------------------------- */

    async cancelCheckout(
        identity: CartIdentity,
        checkoutId: string,
        expectedVersion?: number
    ): Promise<CheckoutResponse> {
        const checkout = await this.repo.findById(checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        if (identity.type === "AUTHENTICATED") {
            if (checkout.customerId?.toString() !== identity.userId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        } else {
            if (checkout.guestSessionId !== identity.sessionId) {
                throw new AppError("Forbidden access to checkout", 403, "FORBIDDEN");
            }
        }

        const expVersion = expectedVersion ?? checkout.version;

        const updatedCheckout = await withTransaction(async (session) => {
            // A. Release Inventory Reservation
            if (checkout.reservationId) {
                await this.resService.releaseReservation(
                    checkout.reservationId.toString(),
                    undefined,
                    session
                );
            }

            // B. Unlock Cart back to ACTIVE
            await this.cartRepo.unlockCart(checkout.cartId, session);

            // C. Transition Checkout Status to CANCELLED with OCC
            const updated = await this.repo.transitionStatus(
                checkoutId,
                "CANCELLED",
                ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"],
                expVersion,
                undefined,
                session
            );

            return updated;
        });

        return this.mapCheckoutToResponse(updatedCheckout);
    }

    /* -------------------------------------------------------------------------- */
    /* Payment Webhook Handler                                                    */
    /* -------------------------------------------------------------------------- */

    async handlePaymentWebhook(payload: {
        event: "payment.succeeded" | "payment.failed";
        checkoutId: string;
        paymentIntentId?: string | undefined;
        reason?: string | undefined;
    }): Promise<CheckoutResponse> {
        const checkout = await this.repo.findById(payload.checkoutId);
        if (!checkout) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        if (payload.event === "payment.succeeded") {
            const updated = await withTransaction(async (session) => {
                // 1. Commit authoritative inventory reservation
                if (checkout.reservationId) {
                    await this.resService.commitReservation(
                        checkout.reservationId.toString(),
                        undefined,
                        session
                    );
                }

                // 2. Mark Cart as converted to order
                await this.cartRepo.convertToOrder(checkout.cartId, session);

                // 3. Mark Checkout COMPLETED
                const comp = await this.repo.transitionStatus(
                    checkout._id,
                    "COMPLETED",
                    ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"],
                    checkout.version,
                    { ...(payload.paymentIntentId ? { paymentIntentId: payload.paymentIntentId } : {}) },
                    session
                );

                return comp;
            });

            return this.mapCheckoutToResponse(updated);
        } else {
            // Payment Failed
            const updated = await withTransaction(async (session) => {
                // 1. Release Inventory Reservation
                if (checkout.reservationId) {
                    await this.resService.releaseReservation(
                        checkout.reservationId.toString(),
                        undefined,
                        session
                    );
                }

                // 2. Unlock Cart back to ACTIVE so customer doesn't lose items
                await this.cartRepo.unlockCart(checkout.cartId, session);

                // 3. Mark Checkout PAYMENT_FAILED
                const failed = await this.repo.transitionStatus(
                    checkout._id,
                    "PAYMENT_FAILED",
                    ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"],
                    checkout.version,
                    { ...(payload.paymentIntentId ? { paymentIntentId: payload.paymentIntentId } : {}) },
                    session
                );

                return failed;
            });

            return this.mapCheckoutToResponse(updated);
        }
    }

    /* -------------------------------------------------------------------------- */
    /* Expiration Cleanup Worker                                                  */
    /* -------------------------------------------------------------------------- */

    async expireStaleCheckouts(batchSize = 50): Promise<number> {
        const stale = await this.repo.findExpiredActiveCheckouts(batchSize);
        let expiredCount = 0;

        for (const checkout of stale) {
            try {
                await withTransaction(async (session) => {
                    if (checkout.reservationId) {
                        await this.resService.releaseReservation(
                            checkout.reservationId.toString(),
                            undefined,
                            session
                        );
                    }
                    await this.cartRepo.unlockCart(checkout.cartId, session);
                    await this.repo.transitionStatus(
                        checkout._id,
                        "EXPIRED",
                        ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"],
                        checkout.version,
                        undefined,
                        session
                    );
                });
                expiredCount++;
            } catch {
                // Ignore concurrent worker collision
            }
        }

        return expiredCount;
    }
}

export const checkoutService = new CheckoutService();
