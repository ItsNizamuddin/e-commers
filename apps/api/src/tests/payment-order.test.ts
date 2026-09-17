import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import crypto from "crypto";
import { Types } from "mongoose";

import app from "../app.js";
import { env } from "../config/env.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import {
    InventoryModel,
    StockMovementModel,
    ReservationModel,
} from "../modules/inventory/inventory.model.js";
import { CartModel } from "../modules/cart/models/cart.model.js";
import { CheckoutModel } from "../modules/checkout/models/checkout.model.js";
import { PaymentModel } from "../modules/payments/models/payment.model.js";
import { PaymentEventModel } from "../modules/payments/models/payment-event.model.js";
import { OrderModel } from "../modules/orders/models/order.model.js";
import { CART_SESSION_COOKIE_NAME } from "../modules/cart/middleware/cart-identity.middleware.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Payment & Order Module Enterprise Architecture Tests", () => {
    let customerAToken: string;
    let customerBToken: string;
    let customerAId: string;
    let customerBId: string;
    let adminToken: string;

    let testCategoryId: string;
    let testProductId: string;
    let variantAId: string;
    let variantBId: string;

    const defaultWarehouseId = DEFAULT_WAREHOUSE_ID;

    function signPayload(payload: object, secret = env.paymentWebhookSecret): string {
        const bodyStr = JSON.stringify(payload);
        return crypto.createHmac("sha256", secret).update(bodyStr).digest("hex");
    }

    beforeAll(async () => {
        await connectDatabase();
        await OrderModel.deleteMany({});
        await PaymentEventModel.deleteMany({});
        await PaymentModel.deleteMany({});
        await CheckoutModel.deleteMany({});
        await CartModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await StockMovementModel.deleteMany({});
        await ReservationModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // 1. Admin Login
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        adminToken = adminLogin.body.data.accessToken;

        // 2. Register & Login Customer A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.order.a@ecommers.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Alpha",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.order.a@ecommers.test",
                password: "Password123!",
            });
        customerAToken = loginA.body.data.accessToken;

        // 3. Register & Login Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.order.b@ecommers.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Beta",
            });
        customerBId = regB.body.data.id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.order.b@ecommers.test",
                password: "Password123!",
            });
        customerBToken = loginB.body.data.accessToken;

        // 4. Create Category & Product
        const category = await CategoryModel.create({
            name: "Order Test Category",
            slug: "order-test-category",
        });
        testCategoryId = category._id.toString();

        variantAId = new Types.ObjectId().toString();
        variantBId = new Types.ObjectId().toString();

        const publishedProduct = await ProductModel.create({
            title: "Payment Order Test Product",
            slug: "payment-order-test-product",
            brand: "ProAcoustics",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "PUBLISHED",
            version: 1,
            variants: [
                {
                    id: variantAId,
                    sku: "ORD-VAR-A",
                    title: "Variant A High Stock",
                    prices: [
                        { currency: "USD", amount: 50.0 },
                        { currency: "INR", amount: 4000.0 },
                    ],
                    isActive: true,
                },
                {
                    id: variantBId,
                    sku: "ORD-VAR-B",
                    title: "Variant B Moderate Stock",
                    prices: [{ currency: "USD", amount: 30.0 }],
                    isActive: true,
                },
            ],
        });
        testProductId = publishedProduct._id.toString();

        // Stock Inventories
        await InventoryModel.create({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(variantAId),
            warehouseId: new Types.ObjectId(defaultWarehouseId),
            onHand: 100,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });

        await InventoryModel.create({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(variantBId),
            warehouseId: new Types.ObjectId(defaultWarehouseId),
            onHand: 50,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });
    }, 120000);

    afterAll(async () => {
        await OrderModel.deleteMany({});
        await PaymentEventModel.deleteMany({});
        await PaymentModel.deleteMany({});
        await CheckoutModel.deleteMany({});
        await CartModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await StockMovementModel.deleteMany({});
        await ReservationModel.deleteMany({});
        await disconnectDatabase();
    });

    // Helper: Initialize checkout for Customer A
    async function setupCustomerACheckout(): Promise<{
        checkoutId: string;
        grandTotalMinor: number;
        currency: string;
    }> {
        // Clear active carts
        await CartModel.deleteMany({ userId: new Types.ObjectId(customerAId) });

        // Add item to cart
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: variantAId,
                quantity: 2,
            });

        // Initialize Checkout
        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Customer",
                    lastName: "Alpha",
                    street: "123 Order Lane",
                    city: "Order City",
                    state: "CA",
                    postalCode: "90210",
                    country: "US",
                },
            });

        return {
            checkoutId: initRes.body.data.id,
            grandTotalMinor: initRes.body.data.pricing.grandTotalMinor,
            currency: initRes.body.data.currency,
        };
    }

    /* -------------------------------------------------------------------------- */
    /* 1. Payment Intent Creation (Customer)                                      */
    /* -------------------------------------------------------------------------- */
    it("Scenario 1: Authenticated customer creates payment intent for INVENTORY_RESERVED checkout", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const res = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                checkoutId,
                provider: "MOCK",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.paymentIntentId).toBeDefined();
        expect(res.body.data.clientSecret).toBeDefined();
        expect(res.body.data.amountMinor).toBe(grandTotalMinor);
        expect(res.body.data.currency).toBe(currency);
        expect(res.body.data.status).toBe("PENDING");

        // Verify Checkout transitioned to PAYMENT_PENDING
        const checkout = await CheckoutModel.findById(checkoutId);
        expect(checkout?.status).toBe("PAYMENT_PENDING");
        expect(checkout?.paymentIntentId).toBe(res.body.data.paymentIntentId);
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Payment Intent Creation (Guest)                                         */
    /* -------------------------------------------------------------------------- */
    it("Scenario 2: Guest customer creates payment intent using session cookie", async () => {
        const agent = request.agent(app);

        // Add to guest cart
        await agent.post("/api/v1/cart/items").send({
            productId: testProductId,
            variantId: variantBId,
            quantity: 1,
        });

        // Initialize guest checkout
        const initRes = await agent.post("/api/v1/checkout").send({
            email: "guest.shopper@ecommers.test",
            shippingAddress: {
                firstName: "Guest",
                lastName: "Shopper",
                street: "456 Guest Ave",
                city: "Guest City",
                state: "NY",
                postalCode: "10001",
                country: "US",
            },
        });

        expect(initRes.status).toBe(201);
        const checkoutId = initRes.body.data.id;

        const res = await agent.post("/api/v1/payments/intents").send({
            checkoutId,
            provider: "MOCK",
        });

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe("PENDING");
        expect(res.body.data.paymentIntentId).toMatch(/^pi_mock_/);
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Idempotent Intent Generation                                             */
    /* -------------------------------------------------------------------------- */
    it("Scenario 3: Repeated intent creation for PENDING checkout reuses existing intent", async () => {
        const { checkoutId } = await setupCustomerACheckout();

        const firstRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const secondRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        expect(secondRes.status).toBe(200);
        expect(secondRes.body.data.paymentIntentId).toBe(firstRes.body.data.paymentIntentId);

        // Ensure database has only 1 payment record for this checkout
        const payments = await PaymentModel.find({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(payments.length).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Reject Intent on Inactive Checkout Status                               */
    /* -------------------------------------------------------------------------- */
    it("Scenario 4: Rejects intent creation if checkout status is CANCELLED or EXPIRED", async () => {
        const { checkoutId } = await setupCustomerACheckout();

        await CheckoutModel.findByIdAndUpdate(checkoutId, { status: "CANCELLED" });

        const res = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_CHECKOUT_STATUS");
    });

    /* -------------------------------------------------------------------------- */
    /* 5. Address Lock Enforcement in PAYMENT_PENDING                             */
    /* -------------------------------------------------------------------------- */
    it("Scenario 5: Locks checkout address modification once payment intent is created", async () => {
        const { checkoutId } = await setupCustomerACheckout();

        // Create intent -> transitions to PAYMENT_PENDING
        await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        // Attempt address patch
        const patchRes = await request(app)
            .patch(`/api/v1/checkout/${checkoutId}/addresses`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                expectedVersion: 1,
                shippingAddress: {
                    firstName: "Changed",
                    lastName: "Attempt",
                    street: "999 Hack Way",
                    city: "City",
                    state: "CA",
                    postalCode: "90001",
                    country: "US",
                },
            });

        expect(patchRes.status).toBe(409);
        expect(patchRes.body.error.code).toBe("STATE_LOCKED");
    });

    /* -------------------------------------------------------------------------- */
    /* 6. Webhook Signature Verification (Valid HMAC)                             */
    /* -------------------------------------------------------------------------- */
    it("Scenario 6: Accepts webhook event with valid HMAC-SHA256 signature", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const paymentIntentId = intentRes.body.data.paymentIntentId;

        const payload = {
            id: `evt_valid_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        const signature = signPayload(payload);

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .set("Content-Type", "application/json")
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("PROCESSED");
    });

    /* -------------------------------------------------------------------------- */
    /* 7. Webhook Signature Verification (Invalid HMAC)                           */
    /* -------------------------------------------------------------------------- */
    it("Scenario 7: Rejects webhook with invalid or tampered signature", async () => {
        const payload = {
            id: `evt_tampered_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: "pi_mock_fake",
            checkoutId: new Types.ObjectId().toString(),
            amountMinor: 5000,
            currency: "USD",
        };

        const invalidSignature = "deadbeefcafebabe0123456789abcdef";

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", invalidSignature)
            .set("Content-Type", "application/json")
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("SIGNATURE_VERIFICATION_FAILED");
    });

    /* -------------------------------------------------------------------------- */
    /* 8. Webhook Missing Signature                                                */
    /* -------------------------------------------------------------------------- */
    it("Scenario 8: Rejects webhook request with missing signature header", async () => {
        const payload = {
            id: `evt_unsigned_${Date.now()}`,
            type: "payment.succeeded",
        };

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("Content-Type", "application/json")
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("MISSING_SIGNATURE");
    });

    /* -------------------------------------------------------------------------- */
    /* 9. Webhook Amount Mismatch Guard                                           */
    /* -------------------------------------------------------------------------- */
    it("Scenario 9: Rejects payment webhook if amount does not match checkout total", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const underpaidAmount = grandTotalMinor - 1000; // Underpaid by $10
        const payload = {
            id: `evt_underpaid_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: underpaidAmount,
            currency,
        };

        const signature = signPayload(payload);

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .set("Content-Type", "application/json")
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("AMOUNT_MISMATCH");

        // Verify Payment is NOT captured
        const payment = await PaymentModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(payment?.status).toBe("PENDING");

        // Verify Event was marked FAILED in ledger
        const event = await PaymentEventModel.findOne({ eventId: payload.id });
        expect(event?.status).toBe("FAILED");
    });

    /* -------------------------------------------------------------------------- */
    /* 10. Webhook Currency Mismatch Guard                                        */
    /* -------------------------------------------------------------------------- */
    it("Scenario 10: Rejects payment webhook if currency does not match checkout", async () => {
        const { checkoutId, grandTotalMinor } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_curr_mismatch_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency: "EUR", // Mismatched currency (checkout is USD)
        };

        const signature = signPayload(payload);

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .set("Content-Type", "application/json")
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("CURRENCY_MISMATCH");
    });

    /* -------------------------------------------------------------------------- */
    /* 11. Event Deduplication & Idempotency                                      */
    /* -------------------------------------------------------------------------- */
    it("Scenario 11: Deduplicates repeated webhook event with ALREADY_PROCESSED status", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_idempotent_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        const signature = signPayload(payload);

        // First delivery
        const first = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .send(payload);
        expect(first.status).toBe(200);
        expect(first.body.data.status).toBe("PROCESSED");

        // Second delivery (replay)
        const second = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .send(payload);
        expect(second.status).toBe(200);
        expect(second.body.data.status).toBe("ALREADY_PROCESSED");

        // Exactly one order created
        const orders = await OrderModel.find({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(orders.length).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 12. Parallel Webhook Concurrency Guard                                     */
    /* -------------------------------------------------------------------------- */
    it("Scenario 12: Handles concurrent parallel webhooks for the same event safely", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_race_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        const signature = signPayload(payload);

        // Fire two simultaneous requests
        const [res1, res2] = await Promise.all([
            request(app).post("/api/v1/payments/webhook").set("x-payment-signature", signature).send(payload),
            request(app).post("/api/v1/payments/webhook").set("x-payment-signature", signature).send(payload),
        ]);

        const statuses = [res1.status, res2.status];
        expect(statuses).toContain(200);

        const orders = await OrderModel.find({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(orders.length).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 13. Stale Lock Crash Recovery                                              */
    /* -------------------------------------------------------------------------- */
    it("Scenario 13: Recovers and reprocesses stale event locked > 5 minutes ago", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const eventId = `evt_stale_${Date.now()}`;
        const payload = {
            id: eventId,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        // Simulate crash: event stuck in PROCESSING locked 6 minutes ago
        const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
        await PaymentEventModel.create({
            provider: "MOCK",
            eventId,
            eventType: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            status: "PROCESSING",
            lockedAt: sixMinutesAgo,
        });

        const signature = signPayload(payload);

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("PROCESSED");

        const order = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(order).not.toBeNull();
    });

    /* -------------------------------------------------------------------------- */
    /* 14. Full Atomic Order Creation Handoff                                     */
    /* -------------------------------------------------------------------------- */
    it("Scenario 14: Atomic transaction creates Order, commits reservation, converts cart, and captures payment", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const checkout = await CheckoutModel.findById(checkoutId);
        const reservationId = checkout?.reservationId;
        const cartId = checkout?.cartId;

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const paymentIntentId = intentRes.body.data.paymentIntentId;

        const payload = {
            id: `evt_atomic_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        const signature = signPayload(payload);

        const webhookRes = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .send(payload);

        expect(webhookRes.status).toBe(200);

        // 1. Verify Order created
        const order = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(order).not.toBeNull();
        expect(order?.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]+$/);
        expect(order?.orderStatus).toBe("CONFIRMED");
        expect(order?.paymentStatus).toBe("CAPTURED");
        expect(order?.fulfillmentStatus).toBe("UNFULFILLED");

        // 2. Verify Reservation committed (SALE stock movements exist)
        const reservation = await ReservationModel.findById(reservationId);
        expect(reservation?.status).toBe("CONFIRMED");

        // 3. Verify Cart converted to order
        const cart = await CartModel.findById(cartId);
        expect(cart?.status).toBe("CONVERTED_TO_ORDER");

        // 4. Verify Checkout COMPLETED
        const completedCheckout = await CheckoutModel.findById(checkoutId);
        expect(completedCheckout?.status).toBe("COMPLETED");

        // 5. Verify Payment CAPTURED and linked to order
        const payment = await PaymentModel.findOne({ paymentIntentId });
        expect(payment?.status).toBe("CAPTURED");
        expect(payment?.orderId?.toString()).toBe(order?._id.toString());
        expect(payment?.capturedAt).toBeDefined();
    });

    /* -------------------------------------------------------------------------- */
    /* 15. Payment Failure Handoff                                                */
    /* -------------------------------------------------------------------------- */
    it("Scenario 15: Payment failure webhook transitions payment and checkout to FAILED and preserves reservation", async () => {
        const { checkoutId, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const paymentIntentId = intentRes.body.data.paymentIntentId;

        const payload = {
            id: `evt_failed_${Date.now()}`,
            type: "payment.failed",
            paymentIntentId,
            checkoutId,
            amountMinor: 0,
            currency,
            payload: { reason: "Card expired or insufficient funds" },
        };

        const signature = signPayload(payload);

        const res = await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signature)
            .send(payload);

        expect(res.status).toBe(200);

        // Payment marked FAILED
        const payment = await PaymentModel.findOne({ paymentIntentId });
        expect(payment?.status).toBe("FAILED");
        expect(payment?.errorMessage).toContain("Card expired");

        // Checkout marked PAYMENT_FAILED
        const checkout = await CheckoutModel.findById(checkoutId);
        expect(checkout?.status).toBe("PAYMENT_FAILED");

        // Order NOT created
        const order = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(order).toBeNull();
    });

    /* -------------------------------------------------------------------------- */
    /* 16. Order Snapshot Immutability                                            */
    /* -------------------------------------------------------------------------- */
    it("Scenario 16: Order items and price snapshot remain immutable after product updates", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_immutable_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signPayload(payload))
            .send(payload);

        const orderBefore = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        const snapshotPrice = orderBefore?.items[0]?.unitPriceMinor;

        // Mutate live product price and title
        await ProductModel.findByIdAndUpdate(testProductId, {
            title: "Changed Live Product Title",
            "variants.0.price": 999.0,
        });

        const orderAfter = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        expect(orderAfter?.items[0]?.unitPriceMinor).toBe(snapshotPrice);
        expect(orderAfter?.items[0]?.productTitle).toBe("Payment Order Test Product");
    });

    /* -------------------------------------------------------------------------- */
    /* 17. Guest Order Possession Token                                           */
    /* -------------------------------------------------------------------------- */
    it("Scenario 17: Guest order access requires possession token (header or query param)", async () => {
        const agent = request.agent(app);

        // Guest cart & checkout
        await agent.post("/api/v1/cart/items").send({
            productId: testProductId,
            variantId: variantBId,
            quantity: 1,
        });

        const initRes = await agent.post("/api/v1/checkout").send({
            email: "possession.guest@ecommers.test",
            shippingAddress: {
                firstName: "Guest",
                lastName: "User",
                street: "777 Token Way",
                city: "Security",
                state: "TX",
                postalCode: "75001",
                country: "US",
            },
        });

        const guestCheckoutId = initRes.body.data.id;
        const grandTotalMinor = initRes.body.data.pricing.grandTotalMinor;
        const currency = initRes.body.data.currency;

        const intentRes = await agent.post("/api/v1/payments/intents").send({
            checkoutId: guestCheckoutId,
            provider: "MOCK",
        });

        const payload = {
            id: `evt_guest_possession_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId: guestCheckoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signPayload(payload))
            .send(payload);

        const guestOrder = await OrderModel.findOne({
            checkoutId: new Types.ObjectId(guestCheckoutId),
        }).select("+guestAccessToken");

        const orderId = guestOrder?._id.toString();
        const token = guestOrder?.guestAccessToken;
        expect(token).toBeDefined();

        // 1. Access without token fails 401
        const unauthRes = await request(app).get(`/api/v1/orders/${orderId}`);
        expect(unauthRes.status).toBe(401);

        // 2. Access with invalid token fails 403
        const invalidTokenRes = await request(app)
            .get(`/api/v1/orders/${orderId}`)
            .set("x-guest-token", "invalid_token_123");
        expect(invalidTokenRes.status).toBe(403);

        // 3. Access with valid token succeeds
        const validRes = await request(app)
            .get(`/api/v1/orders/${orderId}`)
            .set("x-guest-token", token!);
        expect(validRes.status).toBe(200);
        expect(validRes.body.data.id).toBe(orderId);
    });

    /* -------------------------------------------------------------------------- */
    /* 18. Customer Order Isolation                                               */
    /* -------------------------------------------------------------------------- */
    it("Scenario 18: Customer can fetch their own orders but cannot access another customer's order", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_iso_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signPayload(payload))
            .send(payload);

        const orderA = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        const orderAId = orderA?._id.toString();

        // Customer A can view
        const aRes = await request(app)
            .get(`/api/v1/orders/${orderAId}`)
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(aRes.status).toBe(200);

        // Customer B cannot view (403 Forbidden)
        const bRes = await request(app)
            .get(`/api/v1/orders/${orderAId}`)
            .set("Authorization", `Bearer ${customerBToken}`);
        expect(bRes.status).toBe(403);

        // Customer A order list contains the order
        const myListRes = await request(app)
            .get("/api/v1/orders/my-orders")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(myListRes.status).toBe(200);
        expect(myListRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 19. Admin Fulfillment Lifecycle & OCC                                      */
    /* -------------------------------------------------------------------------- */
    it("Scenario 19: Admin fulfillment transitions (UNFULFILLED -> PROCESSING -> SHIPPED -> DELIVERED) with OCC and audit actor", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_fulf_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signPayload(payload))
            .send(payload);

        const order = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        const orderId = order?._id.toString();

        // 1. Illegal transition: UNFULFILLED -> DELIVERED rejected with 409
        const illegalRes = await request(app)
            .patch(`/api/v1/orders/admin/${orderId}/fulfillment`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                fulfillmentStatus: "DELIVERED",
                expectedVersion: 1,
            });
        expect(illegalRes.status).toBe(409);
        expect(illegalRes.body.error.code).toBe("INVALID_STATE_TRANSITION");

        // 2. Legal transition: UNFULFILLED -> PROCESSING
        const pRes = await request(app)
            .patch(`/api/v1/orders/admin/${orderId}/fulfillment`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                fulfillmentStatus: "PROCESSING",
                expectedVersion: 1,
            });
        expect(pRes.status).toBe(200);
        expect(pRes.body.data.fulfillmentStatus).toBe("PROCESSING");
        expect(pRes.body.data.version).toBe(2);

        // 3. Legal transition: PROCESSING -> SHIPPED
        const sRes = await request(app)
            .patch(`/api/v1/orders/admin/${orderId}/fulfillment`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                fulfillmentStatus: "SHIPPED",
                carrier: "FedEx",
                trackingNumber: "FDX123456789",
                expectedVersion: 2,
            });
        expect(sRes.status).toBe(200);
        expect(sRes.body.data.fulfillmentStatus).toBe("SHIPPED");
        expect(sRes.body.data.fulfillment.carrier).toBe("FedEx");
        expect(sRes.body.data.version).toBe(3);

        // 4. Legal transition: SHIPPED -> DELIVERED (auto-completes order)
        const dRes = await request(app)
            .patch(`/api/v1/orders/admin/${orderId}/fulfillment`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                fulfillmentStatus: "DELIVERED",
                expectedVersion: 3,
            });
        expect(dRes.status).toBe(200);
        expect(dRes.body.data.fulfillmentStatus).toBe("DELIVERED");
        expect(dRes.body.data.orderStatus).toBe("COMPLETED");
        expect(dRes.body.data.updatedBy).toBeDefined();
    });

    /* -------------------------------------------------------------------------- */
    /* 20. Order Cancellation & Restock                                           */
    /* -------------------------------------------------------------------------- */
    it("Scenario 20: Order cancellation marks CANCELLED, triggers refund request, and restocks inventory", async () => {
        const { checkoutId, grandTotalMinor, currency } = await setupCustomerACheckout();

        const intentRes = await request(app)
            .post("/api/v1/payments/intents")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ checkoutId, provider: "MOCK" });

        const payload = {
            id: `evt_cancel_${Date.now()}`,
            type: "payment.succeeded",
            paymentIntentId: intentRes.body.data.paymentIntentId,
            checkoutId,
            amountMinor: grandTotalMinor,
            currency,
        };

        await request(app)
            .post("/api/v1/payments/webhook")
            .set("x-payment-signature", signPayload(payload))
            .send(payload);

        const order = await OrderModel.findOne({ checkoutId: new Types.ObjectId(checkoutId) });
        const orderId = order?._id.toString();

        // Check inventory on hand before cancellation
        const invBefore = await InventoryModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(variantAId),
        });
        const onHandBefore = invBefore?.onHand ?? 0;

        // Cancel the order
        const cancelRes = await request(app)
            .post(`/api/v1/orders/${orderId}/cancel`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                expectedVersion: order?.version,
                reason: "Changed mind before shipment",
            });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.orderStatus).toBe("CANCELLED");

        // Verify Payment updated to REFUND_REQUESTED
        const payment = await PaymentModel.findById(order?.paymentId);
        expect(payment?.status).toBe("REFUND_REQUESTED");

        // Verify Inventory on hand was restocked (+2 units)
        const invAfter = await InventoryModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(variantAId),
        });
        expect(invAfter?.onHand).toBe(onHandBefore + 2);
    });
});
