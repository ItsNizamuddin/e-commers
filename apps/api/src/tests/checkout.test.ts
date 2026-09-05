import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
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
import { checkoutRepository } from "../modules/checkout/repositories/checkout.repository.js";
import { checkoutService } from "../modules/checkout/services/checkout.service.js";
import { CART_SESSION_COOKIE_NAME } from "../modules/cart/middleware/cart-identity.middleware.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Checkout Module Enterprise Architecture Tests", () => {
    let customerAToken: string;
    let customerBToken: string;
    let customerAId: string;
    let customerBId: string;

    let testCategoryId: string;
    let testProductId: string;
    let inStockVariantId: string;
    let singleStockVariantId: string;
    let outOfStockVariantId: string;
    let inactiveVariantId: string;
    let draftProductId: string;
    let draftVariantId: string;

    const defaultWarehouseId = DEFAULT_WAREHOUSE_ID;

    beforeAll(async () => {
        await connectDatabase();
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

        // 1. Register & Login Customer A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.checkout.a@shopsphere.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Alpha",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.checkout.a@shopsphere.test",
                password: "Password123!",
            });
        customerAToken = loginA.body.data.accessToken;

        // 2. Register & Login Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.checkout.b@shopsphere.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Beta",
            });
        customerBId = regB.body.data.id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.checkout.b@shopsphere.test",
                password: "Password123!",
            });
        customerBToken = loginB.body.data.accessToken;

        // 3. Category
        const category = await CategoryModel.create({
            name: "High-End Audio",
            slug: "high-end-audio-checkout",
        });
        testCategoryId = category._id.toString();

        // 4. Products & Variants
        inStockVariantId = new Types.ObjectId().toString();
        singleStockVariantId = new Types.ObjectId().toString();
        outOfStockVariantId = new Types.ObjectId().toString();
        inactiveVariantId = new Types.ObjectId().toString();

        const publishedProduct = await ProductModel.create({
            title: "Studio Monitor Headphones",
            slug: "studio-monitor-headphones-checkout",
            brand: "ProAcoustics",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "PUBLISHED",
            version: 1,
            variants: [
                {
                    id: inStockVariantId,
                    sku: "PRO-HEAD-01",
                    title: "Matte Black",
                    prices: [
                        { currency: "USD", amount: 150.0 },
                        { currency: "INR", amount: 12000.0 },
                    ],
                    isActive: true,
                },
                {
                    id: singleStockVariantId,
                    sku: "PRO-HEAD-SINGLE",
                    title: "Special Edition Gold",
                    prices: [{ currency: "USD", amount: 200.0 }],
                    isActive: true,
                },
                {
                    id: outOfStockVariantId,
                    sku: "PRO-HEAD-OOS",
                    title: "Rose Gold",
                    prices: [{ currency: "USD", amount: 180.0 }],
                    isActive: true,
                },
                {
                    id: inactiveVariantId,
                    sku: "PRO-HEAD-INACTIVE",
                    title: "Discontinued White",
                    prices: [{ currency: "USD", amount: 100.0 }],
                    isActive: false,
                },
            ],
        });
        testProductId = publishedProduct._id.toString();

        // Draft Product
        draftVariantId = new Types.ObjectId().toString();
        const draftProduct = await ProductModel.create({
            title: "Unreleased Earphones",
            slug: "unreleased-earphones-checkout",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "DRAFT",
            variants: [
                {
                    id: draftVariantId,
                    sku: "PRO-EAR-DRAFT",
                    title: "Black",
                    prices: [{ currency: "USD", amount: 50.0 }],
                    isActive: true,
                },
            ],
        });
        draftProductId = draftProduct._id.toString();

        // 5. Inventory Records
        // In-stock item: 20 on hand, 0 reserved, 2 safety -> 18 available
        await InventoryModel.create({
            productId: publishedProduct._id,
            variantId: new Types.ObjectId(inStockVariantId),
            warehouseId: defaultWarehouseId,
            onHand: 20,
            reserved: 0,
            backordered: 0,
            safetyStock: 2,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });

        // Single stock item: 1 on hand, 0 reserved, 0 safety -> exactly 1 available
        await InventoryModel.create({
            productId: publishedProduct._id,
            variantId: new Types.ObjectId(singleStockVariantId),
            warehouseId: defaultWarehouseId,
            onHand: 1,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 1,
            allowBackorder: false,
            version: 1,
        });

        // Out of stock item: 0 available
        await InventoryModel.create({
            productId: publishedProduct._id,
            variantId: new Types.ObjectId(outOfStockVariantId),
            warehouseId: defaultWarehouseId,
            onHand: 0,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });
    });

    afterAll(async () => {
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

    beforeEach(async () => {
        await CheckoutModel.deleteMany({});
        await CartModel.deleteMany({});
        // Reset test products state in case any test modified them
        await ProductModel.updateOne(
            { _id: testProductId },
            {
                $set: {
                    status: "PUBLISHED",
                    "variants.0.prices.0.amount": 150.0,
                    "variants.0.isActive": true,
                },
            }
        );
        await ProductModel.updateOne(
            { _id: draftProductId },
            { $set: { status: "DRAFT" } }
        );
        // Reset inventory reservations
        await InventoryModel.updateOne(
            { variantId: new Types.ObjectId(inStockVariantId) },
            { $set: { onHand: 20, reserved: 0, backordered: 0 } }
        );
        await InventoryModel.updateOne(
            { variantId: new Types.ObjectId(singleStockVariantId) },
            { $set: { onHand: 1, reserved: 0, backordered: 0 } }
        );
        await ReservationModel.deleteMany({});
    });

    function getSessionCookie(res: request.Response): string {
        const cookies = res.headers["set-cookie"] as unknown as string[] | string | undefined;
        if (!cookies) return "";
        const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
        for (const c of cookieArray) {
            if (c.startsWith(`${CART_SESSION_COOKIE_NAME}=`)) {
                const part = c.split(";")[0];
                if (part) {
                    const val = part.split("=")[1];
                    if (val) return val;
                }
            }
        }
        return "";
    }

    /* -------------------------------------------------------------------------- */
    /* 1. Initiate Checkout & Cart Lock                                           */
    /* -------------------------------------------------------------------------- */
    it("1. Initiates checkout, locks cart, reserves stock in inventory, and sets 15m TTL", async () => {
        // Customer adds item to cart
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        // Initiate Checkout
        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Customer",
                    lastName: "Alpha",
                    street: "123 Tech Way",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94105",
                    country: "US",
                },
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const checkout = res.body.data;
        expect(checkout.status).toBe("INVENTORY_RESERVED");
        expect(checkout.customerId).toBe(customerAId);
        expect(checkout.currency).toBe("USD");
        expect(checkout.items).toHaveLength(1);
        expect(checkout.items[0].quantity).toBe(2);
        expect(checkout.items[0].unitPriceMinor).toBe(15000); // $150.00
        expect(checkout.items[0].lineTotalMinor).toBe(30000); // $300.00

        // Invariant: Cart must be LOCKED
        const cartInDb = await CartModel.findById(checkout.cartId);
        expect(cartInDb?.status).toBe("LOCKED");

        // Invariant: Reservation created in Inventory module
        expect(checkout.reservationId).toBeDefined();
        const reservationInDb = await ReservationModel.findById(checkout.reservationId);
        expect(reservationInDb?.status).toBe("PENDING");
        expect(reservationInDb?.items[0]?.reservedPhysical).toBe(2);

        // Invariant: Physical stock reserved on inventory document
        const invInDb = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(invInDb?.reserved).toBe(2);

        // Invariant: 15-minute expiration
        const expiresAtTime = new Date(checkout.expiresAt).getTime();
        expect(expiresAtTime).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
        expect(expiresAtTime).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Idempotency Key Guard                                                   */
    /* -------------------------------------------------------------------------- */
    it("2. Submitting POST /checkout with same X-Idempotency-Key returns existing checkout without duplicate reservation", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const idempKey = `chk-idemp-${Date.now()}`;

        // First call
        const first = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("X-Idempotency-Key", idempKey)
            .send({
                email: "customer.checkout.a@shopsphere.test",
            });

        expect(first.status).toBe(201);
        const checkoutId = first.body.data.id;

        // Inventory reserved = 2
        let inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(2);

        // Duplicate retry call with same idempotency key
        const retry = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("X-Idempotency-Key", idempKey)
            .send({
                email: "customer.checkout.a@shopsphere.test",
            });

        expect(retry.status).toBe(201);
        expect(retry.body.data.id).toBe(checkoutId);

        // Stock reserved remains 2, does NOT double-reserve to 4
        inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(2);
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Live Catalog Price Drift Guard (409 PRICE_CHANGED)                      */
    /* -------------------------------------------------------------------------- */
    it("3. Catalog price change triggers 409 PRICE_CHANGED with diff and prevents reservation", async () => {
        // Customer adds item at $150
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Catalog updates price to $175
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.prices.0.amount": 175.0 } }
        );

        // Attempt checkout -> 409 PRICE_CHANGED
        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("PRICE_CHANGED");
        expect(res.body.error.details.changes).toHaveLength(1);

        const drift = res.body.error.details.changes[0];
        expect(drift.variantId).toBe(inStockVariantId);
        expect(drift.cartPrice).toBe(150.0);
        expect(drift.currentPrice).toBe(175.0);

        // Invariant: Zero reservations made, cart remains ACTIVE
        const inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(0);

        const cart = await CartModel.findOne({ userId: customerAId });
        expect(cart?.status).toBe("ACTIVE");

        // Restore catalog price
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.prices.0.amount": 150.0 } }
        );
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Unpublished Product Rejection                                           */
    /* -------------------------------------------------------------------------- */
    it("4. Product marked DRAFT rejects checkout with 400 PRODUCT_NOT_PUBLISHED", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Product unpublished
        await ProductModel.updateOne({ _id: testProductId }, { $set: { status: "DRAFT" } });

        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("PRODUCT_NOT_PUBLISHED");

        // Restore published status
        await ProductModel.updateOne({ _id: testProductId }, { $set: { status: "PUBLISHED" } });
    });

    /* -------------------------------------------------------------------------- */
    /* 5. Inactive Variant Rejection                                              */
    /* -------------------------------------------------------------------------- */
    it("5. Variant marked isActive: false rejects checkout with 400 VARIANT_INACTIVE", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Variant deactivated
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.isActive": false } }
        );

        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VARIANT_INACTIVE");

        // Restore active variant
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.isActive": true } }
        );
    });

    /* -------------------------------------------------------------------------- */
    /* 6. Insufficient Physical Stock Rejection                                   */
    /* -------------------------------------------------------------------------- */
    it("6. Checkout fails with 400 INSUFFICIENT_STOCK if stock became depleted before checkout", async () => {
        // Customer adds 10 units to cart
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 10,
            });

        // Stock in warehouse drops to 5
        await InventoryModel.updateOne(
            { variantId: new Types.ObjectId(inStockVariantId) },
            { $set: { onHand: 5 } }
        );

        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

        // Cart remains ACTIVE
        const cart = await CartModel.findOne({ userId: customerAId });
        expect(cart?.status).toBe("ACTIVE");
    });

    /* -------------------------------------------------------------------------- */
    /* 7. Minor Unit Integer Precision (USD)                                      */
    /* -------------------------------------------------------------------------- */
    it("7. Computes exact minor unit breakdown (subtotal + shipping + tax - discount = grandTotal)", async () => {
        // $150.00 * 1 = $150.00 -> Free shipping (>= $100), 8% US tax = $12.00
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "John",
                    lastName: "Doe",
                    street: "500 Market St",
                    city: "San Francisco",
                    state: "CA",
                    postalCode: "94105",
                    country: "US",
                },
            });

        expect(res.status).toBe(201);
        const pricing = res.body.data.pricing;
        expect(pricing.currency).toBe("USD");
        expect(pricing.subtotalMinor).toBe(15000); // $150.00
        expect(pricing.shippingMinor).toBe(0); // Free shipping
        expect(pricing.taxMinor).toBe(1200); // 8% of 15000
        expect(pricing.discountMinor).toBe(0);
        expect(pricing.grandTotalMinor).toBe(16200); // $162.00

        // Invariant: Exact balance
        expect(
            pricing.subtotalMinor +
                pricing.shippingMinor +
                pricing.taxMinor -
                pricing.discountMinor
        ).toBe(pricing.grandTotalMinor);
    });

    /* -------------------------------------------------------------------------- */
    /* 8. Multi-Currency Calculation (INR)                                        */
    /* -------------------------------------------------------------------------- */
    it("8. Validates correct minor unit calculations for INR (₹12,000 * 1 = 1,200,000 paise)", async () => {
        // Customer creates cart in INR
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
                currency: "INR",
            });

        const res = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Raj",
                    lastName: "Patel",
                    street: "100 MG Road",
                    city: "Bangalore",
                    state: "KA",
                    postalCode: "560001",
                    country: "IN",
                },
            });

        expect(res.status).toBe(201);
        const pricing = res.body.data.pricing;
        expect(pricing.currency).toBe("INR");
        expect(pricing.subtotalMinor).toBe(1200000); // 12000 * 100 paise
        expect(pricing.taxMinor).toBe(Math.round(1200000 * 0.18)); // 18% GST in IN
        expect(pricing.shippingMinor).toBe(0); // >= ₹1,000 free threshold
    });

    /* -------------------------------------------------------------------------- */
    /* 9. Address Update & Totals Recalculation                                    */
    /* -------------------------------------------------------------------------- */
    it("9. Updating shipping address in INVENTORY_RESERVED recalculates tax & shipping", async () => {
        // Initially no address -> tax = 0, shipping = 0
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;
        const initialVersion = initRes.body.data.version;
        expect(initRes.body.data.pricing.taxMinor).toBe(0);

        // Update shipping address to US
        const patchRes = await request(app)
            .patch(`/api/v1/checkout/${checkoutId}/addresses`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Alice",
                    lastName: "Smith",
                    street: "10 Broadway",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US",
                },
                expectedVersion: initialVersion,
            });

        expect(patchRes.status).toBe(200);
        expect(patchRes.body.data.pricing.taxMinor).toBe(1200); // 8% calculated now
        expect(patchRes.body.data.version).toBe(initialVersion + 1);
    });

    /* -------------------------------------------------------------------------- */
    /* 10. Address Update State Guard                                             */
    /* -------------------------------------------------------------------------- */
    it("10. Rejects address update with 409 STATE_LOCKED if checkout is in PAYMENT_PENDING", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;

        // Transition checkout to PAYMENT_PENDING
        await CheckoutModel.updateOne(
            { _id: checkoutId },
            { $set: { status: "PAYMENT_PENDING" } }
        );

        // Attempt address change -> 409
        const patchRes = await request(app)
            .patch(`/api/v1/checkout/${checkoutId}/addresses`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Alice",
                    lastName: "Smith",
                    street: "10 Broadway",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US",
                },
                expectedVersion: initRes.body.data.version,
            });

        expect(patchRes.status).toBe(409);
        expect(patchRes.body.error.code).toBe("STATE_LOCKED");
    });

    /* -------------------------------------------------------------------------- */
    /* 11. Address Update OCC Conflict                                            */
    /* -------------------------------------------------------------------------- */
    it("11. Rejects address update with 409 OCC_CONFLICT if expectedVersion is stale", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;

        const patchRes = await request(app)
            .patch(`/api/v1/checkout/${checkoutId}/addresses`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                shippingAddress: {
                    firstName: "Alice",
                    lastName: "Smith",
                    street: "10 Broadway",
                    city: "New York",
                    state: "NY",
                    postalCode: "10001",
                    country: "US",
                },
                expectedVersion: 999, // Stale version
            });

        expect(patchRes.status).toBe(409);
        expect(patchRes.body.error.code).toBe("OCC_CONFLICT");
    });

    /* -------------------------------------------------------------------------- */
    /* 12. Customer Explicit Cancellation Recovery                                */
    /* -------------------------------------------------------------------------- */
    it("12. Explicit cancellation releases physical reservation and restores cart to ACTIVE", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;
        const reservationId = initRes.body.data.reservationId;

        // Cancel checkout
        const cancelRes = await request(app)
            .post(`/api/v1/checkout/${checkoutId}/cancel`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.status).toBe("CANCELLED");

        // Inventory reservation is released
        const resInDb = await ReservationModel.findById(reservationId);
        expect(resInDb?.status).toBe("RELEASED");

        // Physical reserved stock back to 0
        const inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(0);

        // Cart is unlocked back to ACTIVE
        const cartInDb = await CartModel.findById(initRes.body.data.cartId);
        expect(cartInDb?.status).toBe("ACTIVE");
    });

    /* -------------------------------------------------------------------------- */
    /* 13. Payment Failure Webhook Recovery                                       */
    /* -------------------------------------------------------------------------- */
    it("13. Payment failure webhook releases reservation and restores cart to ACTIVE", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;
        const reservationId = initRes.body.data.reservationId;

        // Webhook receives payment.failed
        const webhookRes = await request(app)
            .post("/api/v1/checkout/webhook")
            .send({
                event: "payment.failed",
                checkoutId,
                reason: "Insufficient funds in bank account",
            });

        expect(webhookRes.status).toBe(200);
        expect(webhookRes.body.data.status).toBe("PAYMENT_FAILED");

        // Reservation released
        const resInDb = await ReservationModel.findById(reservationId);
        expect(resInDb?.status).toBe("RELEASED");

        // Stock restored
        const inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(0);

        // Cart restored to ACTIVE
        const cart = await CartModel.findById(initRes.body.data.cartId);
        expect(cart?.status).toBe("ACTIVE");
    });

    /* -------------------------------------------------------------------------- */
    /* 14. Payment Success Webhook Conversion                                     */
    /* -------------------------------------------------------------------------- */
    it("14. Payment success commits stock reservation, converts cart, and completes checkout", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;
        const reservationId = initRes.body.data.reservationId;

        // Webhook receives payment.succeeded
        const webhookRes = await request(app)
            .post("/api/v1/checkout/webhook")
            .send({
                event: "payment.succeeded",
                checkoutId,
                paymentIntentId: "pi_stripe_123456789",
            });

        expect(webhookRes.status).toBe(200);
        expect(webhookRes.body.data.status).toBe("COMPLETED");
        expect(webhookRes.body.data.paymentIntentId).toBe("pi_stripe_123456789");

        // Invariant: Reservation committed in inventory
        const resInDb = await ReservationModel.findById(reservationId);
        expect(resInDb?.status).toBe("CONFIRMED");

        // Physical onHand decremented from 20 to 18, reserved back to 0
        const inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.onHand).toBe(18);
        expect(inv?.reserved).toBe(0);

        // Cart marked CONVERTED_TO_ORDER
        const cart = await CartModel.findById(initRes.body.data.cartId);
        expect(cart?.status).toBe("CONVERTED_TO_ORDER");
    });

    /* -------------------------------------------------------------------------- */
    /* 15. Reservation Commit Precedence Guard                                    */
    /* -------------------------------------------------------------------------- */
    it("15. Checkout is marked COMPLETED only when reservation confirmation succeeds", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;

        // Simulate reservation already released/cancelled beforehand
        await ReservationModel.updateOne(
            { _id: initRes.body.data.reservationId },
            { $set: { status: "RELEASED" } }
        );

        // Attempting payment webhook when reservation cannot be committed throws 400
        const webhookRes = await request(app)
            .post("/api/v1/checkout/webhook")
            .send({
                event: "payment.succeeded",
                checkoutId,
            });

        expect(webhookRes.status).toBe(400);

        // Invariant: Checkout was NOT marked COMPLETED
        const checkoutInDb = await CheckoutModel.findById(checkoutId);
        expect(checkoutInDb?.status).not.toBe("COMPLETED");
    });

    /* -------------------------------------------------------------------------- */
    /* 16. Session Timeout & Expiry Cleanup                                       */
    /* -------------------------------------------------------------------------- */
    it("16. Expired checkout worker releases inventory reservation and unlocks cart", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;

        // Fast-forward expiresAt into past
        await CheckoutModel.updateOne(
            { _id: checkoutId },
            { $set: { expiresAt: new Date(Date.now() - 5000) } }
        );

        // Run background expiration worker
        const expiredCount = await checkoutService.expireStaleCheckouts();
        expect(expiredCount).toBeGreaterThanOrEqual(1);

        // Checkout status is EXPIRED
        const checkoutInDb = await CheckoutModel.findById(checkoutId);
        expect(checkoutInDb?.status).toBe("EXPIRED");

        // Cart is unlocked back to ACTIVE
        const cartInDb = await CartModel.findById(initRes.body.data.cartId);
        expect(cartInDb?.status).toBe("ACTIVE");

        // Inventory is restored
        const inv = await InventoryModel.findOne({ variantId: inStockVariantId });
        expect(inv?.reserved).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 17. Strict Identity Invariant (customerId XOR guestSessionId)              */
    /* -------------------------------------------------------------------------- */
    it("17. Rejects checkout with both customerId and guestSessionId set", async () => {
        const invalidDoc = new CheckoutModel({
            cartId: new Types.ObjectId(),
            customerId: new Types.ObjectId(),
            guestSessionId: "guest_session_123", // BOTH SET!
            customerEmailSnapshot: "test@example.com",
            currency: "USD",
            items: [
                {
                    productId: new Types.ObjectId(),
                    variantId: inStockVariantId,
                    sku: "TEST-SKU",
                    productTitle: "Test",
                    variantTitle: "Test",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 1000,
                    lineTotalMinor: 1000,
                    productVersion: 1,
                    priceCapturedAt: new Date(),
                },
            ],
            pricing: {
                subtotalMinor: 1000,
                shippingMinor: 0,
                taxMinor: 0,
                discountMinor: 0,
                grandTotalMinor: 1000,
                currency: "USD",
            },
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        await expect(invalidDoc.validate()).rejects.toThrow(
            "Checkout must be identified by exactly one of 'customerId' OR 'guestSessionId'."
        );
    });

    /* -------------------------------------------------------------------------- */
    /* 18. Customer Email Snapshotting                                            */
    /* -------------------------------------------------------------------------- */
    it("18. Customer email snapshot remains immutable even if user profile email changes", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;
        expect(initRes.body.data.customerEmailSnapshot).toBe("customer.checkout.a@shopsphere.test");

        // User updates email on their profile
        await UserModel.updateOne(
            { _id: customerAId },
            { $set: { email: "new.email@example.com" } }
        );

        // Checkout email snapshot remains untouched
        const getRes = await request(app)
            .get(`/api/v1/checkout/${checkoutId}`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(getRes.body.data.customerEmailSnapshot).toBe("customer.checkout.a@shopsphere.test");
    });

    /* -------------------------------------------------------------------------- */
    /* 19. Illegal State Transition Guard                                         */
    /* -------------------------------------------------------------------------- */
    it("19. Transitioning from terminal state throws 409 INVALID_STATE_TRANSITION", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const initRes = await request(app)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        const checkoutId = initRes.body.data.id;

        // Cancel checkout
        await request(app)
            .post(`/api/v1/checkout/${checkoutId}/cancel`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send();

        // Attempt illegal transition from CANCELLED to COMPLETED
        await expect(
            checkoutRepository.transitionStatus(
                checkoutId,
                "COMPLETED",
                ["INVENTORY_RESERVED", "PAYMENT_PENDING"],
                2
            )
        ).rejects.toThrow("Illegal status transition");
    });

    /* -------------------------------------------------------------------------- */
    /* 20. Concurrent Checkouts on Single Remaining Stock                         */
    /* -------------------------------------------------------------------------- */
    it("20. Parallel checkouts on single stock: exactly 1 succeeds, 1 rejected with 0 race oversell", async () => {
        // Customer A adds the single stock item
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: singleStockVariantId,
                quantity: 1,
            });

        // Customer B adds the single stock item
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerBToken}`)
            .send({
                productId: testProductId,
                variantId: singleStockVariantId,
                quantity: 1,
            });

        // Concurrently trigger checkout for both
        const [resA, resB] = await Promise.all([
            request(app)
                .post("/api/v1/checkout")
                .set("Authorization", `Bearer ${customerAToken}`)
                .send(),
            request(app)
                .post("/api/v1/checkout")
                .set("Authorization", `Bearer ${customerBToken}`)
                .send(),
        ]);

        const statuses = [resA.status, resB.status];
        expect(statuses).toContain(201); // Exactly one succeeded
        expect(statuses).toContain(400); // Exactly one rejected due to stock

        // Verified physical inventory: reserved is exactly 1, not 2
        const inv = await InventoryModel.findOne({ variantId: singleStockVariantId });
        expect(inv?.reserved).toBe(1);
    });
});
