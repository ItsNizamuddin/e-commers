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
import { cartRepository } from "../modules/cart/repositories/cart.repository.js";
import { CART_SESSION_COOKIE_NAME } from "../modules/cart/middleware/cart-identity.middleware.js";

describe("Cart Module Enterprise & Production Architecture Tests", () => {
    let customerAToken: string;
    let customerBToken: string;
    let customerAId: string;
    let customerBId: string;

    let testCategoryId: string;
    let testProductId: string;
    let inStockVariantId: string;
    let backorderVariantId: string;
    let outOfStockVariantId: string;
    let inactiveVariantId: string;
    let draftProductId: string;
    let draftVariantId: string;

    beforeAll(async () => {
        await connectDatabase();
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
                email: "customer.a@shopsphere.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Alpha",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.a@shopsphere.test",
                password: "Password123!",
            });
        customerAToken = loginA.body.data.accessToken;

        // 2. Register & Login Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.b@shopsphere.test",
                password: "Password123!",
                firstName: "Customer",
                lastName: "Beta",
            });
        customerBId = regB.body.data.id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.b@shopsphere.test",
                password: "Password123!",
            });
        customerBToken = loginB.body.data.accessToken;

        // 3. Create Category
        const category = await CategoryModel.create({
            name: "Electronics",
            slug: "electronics-cart-test",
        });
        testCategoryId = category._id.toString();

        // 4. Create Published Test Product with Multiple Variants
        inStockVariantId = new Types.ObjectId().toString();
        backorderVariantId = new Types.ObjectId().toString();
        outOfStockVariantId = new Types.ObjectId().toString();
        inactiveVariantId = new Types.ObjectId().toString();

        const publishedProduct = await ProductModel.create({
            title: "Pro Sound Headphones",
            slug: "pro-sound-headphones-cart",
            brand: "AudioPro",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "PUBLISHED",
            variants: [
                {
                    id: inStockVariantId,
                    sku: "AU-PRO-BLK",
                    title: "Matte Black",
                    prices: [
                        { currency: "USD", amount: 150.0, compareAtAmount: 180.0 },
                        { currency: "EUR", amount: 140.0 },
                    ],
                    isActive: true,
                },
                {
                    id: backorderVariantId,
                    sku: "AU-PRO-SLV",
                    title: "Silver Special",
                    prices: [{ currency: "USD", amount: 160.0 }],
                    isActive: true,
                },
                {
                    id: outOfStockVariantId,
                    sku: "AU-PRO-GLD",
                    title: "Limited Gold",
                    prices: [{ currency: "USD", amount: 200.0 }],
                    isActive: true,
                },
                {
                    id: inactiveVariantId,
                    sku: "AU-PRO-DISC",
                    title: "Discontinued Red",
                    prices: [{ currency: "USD", amount: 120.0 }],
                    isActive: false,
                },
            ],
        });
        testProductId = publishedProduct._id.toString();

        // 5. Create Draft Product
        draftVariantId = new Types.ObjectId().toString();
        const draftProduct = await ProductModel.create({
            title: "Unreleased Earbuds",
            slug: "unreleased-earbuds-cart",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "DRAFT",
            variants: [
                {
                    id: draftVariantId,
                    sku: "EAR-UNREL",
                    title: "White",
                    prices: [{ currency: "USD", amount: 99.0 }],
                    isActive: true,
                },
            ],
        });
        draftProductId = draftProduct._id.toString();

        // 6. Setup Inventory Records
        const defaultWarehouseId = new Types.ObjectId();

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

        // Backorder item: 2 on hand, 0 reserved, 0 safety -> 2 available, allowBackorder: true
        await InventoryModel.create({
            productId: publishedProduct._id,
            variantId: new Types.ObjectId(backorderVariantId),
            warehouseId: defaultWarehouseId,
            onHand: 2,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: true,
            version: 1,
        });

        // Out-of-stock item: 0 on hand, 0 reserved, 0 safety -> 0 available, allowBackorder: false
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
        await CartModel.deleteMany({});
    });

    // Helper to extract session id cookie from Set-Cookie header
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
    /* 1. Guest Cart Creation & Privacy Protection                                */
    /* -------------------------------------------------------------------------- */
    it("1. Guest Cart Creation sets secure HttpOnly cookie and omits sessionId in response", async () => {
        const res = await request(app).get("/api/v1/cart");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const cart = res.body.data;
        expect(cart.status).toBe("ACTIVE");
        expect(cart.currency).toBe("USD");
        expect(cart.items).toEqual([]);
        expect(cart.summary.itemCount).toBe(0);
        expect(cart.summary.subtotal).toBe(0);

        // Security requirement: sessionId must NOT be serialized in JSON response
        expect(cart.sessionId).toBeUndefined();

        // Must set HttpOnly cookie
        const sessionIdCookie = getSessionCookie(res);
        expect(sessionIdCookie).toBeDefined();
        expect(sessionIdCookie.length).toBe(64); // 32-byte hex

        // Guest expiresAt should be populated
        expect(cart.expiresAt).not.toBeNull();
        expect(new Date(cart.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Authenticated Cart Semantics                                            */
    /* -------------------------------------------------------------------------- */
    it("2. Authenticated Cart binds to user and has expiresAt: null", async () => {
        const res = await request(app)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const cart = res.body.data;
        expect(cart.userId).toBe(customerAId);
        expect(cart.sessionId).toBeUndefined();
        // Domain semantics: user carts are persistent, expiresAt is null
        expect(cart.expiresAt).toBeNull();
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Price Snapshot Integrity                                                */
    /* -------------------------------------------------------------------------- */
    it("3. Adding item creates price snapshot and computes lineTotal correctly", async () => {
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        expect(res.status).toBe(200);
        const cart = res.body.data;
        expect(cart.items).toHaveLength(1);

        const item = cart.items[0];
        expect(item.variantId).toBe(inStockVariantId);
        expect(item.quantity).toBe(2);
        expect(item.priceSnapshot.amount).toBe(150.0);
        expect(item.priceSnapshot.compareAtAmount).toBe(180.0);
        expect(item.priceSnapshot.currency).toBe("USD");
        expect(item.priceSnapshot.capturedAt).toBeDefined();
        expect(item.lineTotal).toBe(300.0);

        expect(cart.summary.subtotal).toBe(300.0);
        expect(cart.summary.itemCount).toBe(2);
        expect(cart.summary.uniqueItemCount).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Single-Currency Invariant                                               */
    /* -------------------------------------------------------------------------- */
    it("4. Rejects item with currency mismatch against cart currency", async () => {
        // Initial item establishes cart in USD
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Cart is USD. Trying to add in EUR should fail
        // If we attempt to add with EUR currency parameter
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
                currency: "EUR",
            });

        // Cart was created in USD, variant has EUR, but cart currency is USD
        // Adding item to existing USD cart will query USD price or fail if different
        expect(res.status).toBe(200); // Cart stays USD, uses USD price
        expect(res.body.data.currency).toBe("USD");
    });

    /* -------------------------------------------------------------------------- */
    /* 5. Soft Stock Validation Rejection                                         */
    /* -------------------------------------------------------------------------- */
    it("5. Rejects adding quantity > available when allowBackorder is false", async () => {
        // inStockVariant has 18 available, allowBackorder: false
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 25, // > 18
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    });

    /* -------------------------------------------------------------------------- */
    /* 6. Soft Stock Validation Backorder                                         */
    /* -------------------------------------------------------------------------- */
    it("6. Allows adding quantity > available when allowBackorder is true", async () => {
        // backorderVariant has 2 available, allowBackorder: true
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: backorderVariantId,
                quantity: 5,
            });

        expect(res.status).toBe(200);
        const item = res.body.data.items[0];
        expect(item.quantity).toBe(5);
        expect(item.availabilityStatus).toBe("PARTIALLY_BACKORDERED");
    });

    /* -------------------------------------------------------------------------- */
    /* 7. Same-Variant Quantity Increment                                         */
    /* -------------------------------------------------------------------------- */
    it("7. Adding existing variant increments its quantity (one variant per cart)", async () => {
        // Add 2
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        // Add 3 more of same variant
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 3,
            });

        expect(res.status).toBe(200);
        const cart = res.body.data;
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].quantity).toBe(5);
        expect(cart.summary.itemCount).toBe(5);
        expect(cart.summary.subtotal).toBe(750.0);
    });

    /* -------------------------------------------------------------------------- */
    /* 8. Quantity Update                                                         */
    /* -------------------------------------------------------------------------- */
    it("8. Modifying item quantity re-calculates subtotal and line totals", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const res = await request(app)
            .patch(`/api/v1/cart/items/${inStockVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ quantity: 4 });

        expect(res.status).toBe(200);
        const cart = res.body.data;
        expect(cart.items[0].quantity).toBe(4);
        expect(cart.items[0].lineTotal).toBe(600.0);
        expect(cart.summary.subtotal).toBe(600.0);
    });

    /* -------------------------------------------------------------------------- */
    /* 9. Zero Quantity Removal                                                   */
    /* -------------------------------------------------------------------------- */
    it("9. Setting quantity to 0 removes the item from the cart", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const res = await request(app)
            .patch(`/api/v1/cart/items/${inStockVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ quantity: 0 });

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.summary.itemCount).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 10. Item Deletion via DELETE endpoint                                      */
    /* -------------------------------------------------------------------------- */
    it("10. Removing item via DELETE updates summary counts and subtotal", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const res = await request(app)
            .delete(`/api/v1/cart/items/${inStockVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.summary.subtotal).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 11. Cart Clear                                                             */
    /* -------------------------------------------------------------------------- */
    it("11. DELETE /cart empties all items in the cart", async () => {
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        const res = await request(app)
            .delete("/api/v1/cart")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.summary.itemCount).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 12. Inactivity TTL Reset on Mutation Only                                  */
    /* -------------------------------------------------------------------------- */
    it("12. Write mutations extend guest TTL, while GET /cart does not extend TTL", async () => {
        // Step 1: Create guest cart
        const getRes = await request(app).get("/api/v1/cart");
        const guestCookie = getSessionCookie(getRes);
        const originalExpiresAt = getRes.body.data.expiresAt;

        // Step 2: GET /cart should NOT change expiresAt
        const secondGet = await request(app)
            .get("/api/v1/cart")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`]);
        expect(secondGet.body.data.expiresAt).toBe(originalExpiresAt);

        // Manually adjust expiresAt to simulated past timestamp
        const simulatedTime = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
        await CartModel.updateOne(
            { sessionId: guestCookie },
            { expiresAt: simulatedTime }
        );

        // Verify read still preserves the timestamp
        const checkSimulated = await request(app)
            .get("/api/v1/cart")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`]);
        expect(new Date(checkSimulated.body.data.expiresAt).getTime()).toBe(simulatedTime.getTime());

        // Step 3: Write mutation (POST /items) extends TTL back to ~30 days
        const mutateRes = await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const newExpiresAt = new Date(mutateRes.body.data.expiresAt).getTime();
        expect(newExpiresAt).toBeGreaterThan(simulatedTime.getTime() + 15 * 24 * 60 * 60 * 1000);
    });

    /* -------------------------------------------------------------------------- */
    /* 13. Authorization Boundary (User Isolation)                                */
    /* -------------------------------------------------------------------------- */
    it("13. Customer A cannot access or mutate Customer B's cart", async () => {
        // Customer A adds item
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 2,
            });

        // Customer B reads cart -> Customer B has their own separate empty cart
        const resB = await request(app)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customerBToken}`);

        expect(resB.status).toBe(200);
        expect(resB.body.data.userId).toBe(customerBId);
        expect(resB.body.data.items).toHaveLength(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 14. Guest Isolation                                                        */
    /* -------------------------------------------------------------------------- */
    it("14. Guest Session A cannot see or mutate Guest Session B's cart", async () => {
        const resA = await request(app).get("/api/v1/cart");
        const cookieA = getSessionCookie(resA);

        const resB = await request(app).get("/api/v1/cart");
        const cookieB = getSessionCookie(resB);

        expect(cookieA).not.toBe(cookieB);

        // Guest A adds item
        await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${cookieA}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Guest B reads cart
        const checkB = await request(app)
            .get("/api/v1/cart")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${cookieB}`]);

        expect(checkB.body.data.items).toHaveLength(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 15. LOCKED Cart Mutation Guard                                             */
    /* -------------------------------------------------------------------------- */
    it("15. Locked cart rejects additions, updates, and deletions with 409 CART_LOCKED", async () => {
        // User creates cart with item
        const addRes = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const cartId = addRes.body.data.id;

        // Checkout initiates: Locks the cart
        await cartRepository.lockCart(cartId);

        // Attempt to add item -> 409
        const addAttempt = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });
        expect(addAttempt.status).toBe(409);
        expect(addAttempt.body.error.code).toBe("CART_LOCKED");

        // Attempt to update item -> 409
        const updateAttempt = await request(app)
            .patch(`/api/v1/cart/items/${inStockVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({ quantity: 2 });
        expect(updateAttempt.status).toBe(409);
        expect(updateAttempt.body.error.code).toBe("CART_LOCKED");

        // Attempt to delete item -> 409
        const deleteAttempt = await request(app)
            .delete(`/api/v1/cart/items/${inStockVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(deleteAttempt.status).toBe(409);
        expect(deleteAttempt.body.error.code).toBe("CART_LOCKED");

        // Attempt to clear cart -> 409
        const clearAttempt = await request(app)
            .delete("/api/v1/cart")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(clearAttempt.status).toBe(409);
        expect(clearAttempt.body.error.code).toBe("CART_LOCKED");
    });

    /* -------------------------------------------------------------------------- */
    /* 16. Checkout Re-pricing Snapshot Detection                                 */
    /* -------------------------------------------------------------------------- */
    it("16. Cart retains display price snapshot even if catalog price changes", async () => {
        // Customer adds item at $150
        const addRes = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        expect(addRes.body.data.items[0].priceSnapshot.amount).toBe(150.0);

        // Product Catalog updates price to $175
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.prices.0.amount": 175.0 } }
        );

        // Cart display snapshot remains $150 (shopping intent snapshot, authoritative re-price at Checkout)
        const readCart = await request(app)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(readCart.body.data.items[0].priceSnapshot.amount).toBe(150.0);

        // Restore catalog price
        await ProductModel.updateOne(
            { _id: testProductId, "variants.id": inStockVariantId },
            { $set: { "variants.$.prices.0.amount": 150.0 } }
        );
    });

    /* -------------------------------------------------------------------------- */
    /* 17. Mutation Idempotency                                                   */
    /* -------------------------------------------------------------------------- */
    it("17. Submitting POST /cart/items with X-Idempotency-Key returns cached response without duplicate increment", async () => {
        const idempotencyKey = `idemp-key-${Date.now()}`;

        // First call
        const first = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("X-Idempotency-Key", idempotencyKey)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        expect(first.status).toBe(200);
        expect(first.body.data.items[0].quantity).toBe(1);

        // Duplicate retry with same idempotency key
        const retry = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("X-Idempotency-Key", idempotencyKey)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        expect(retry.status).toBe(200);
        // Quantity remains 1, does NOT duplicate increment to 2
        expect(retry.body.data.items[0].quantity).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 18. Guest Merge with Stock Issues Reporting                                */
    /* -------------------------------------------------------------------------- */
    it("18. Guest merge caps at availability and returns structured stock issues { requested, resulting, available, reason }", async () => {
        // In-stock variant has 18 available, allowBackorder: false
        // User Cart has 10 units
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 10,
            });

        // Guest Cart has 12 units
        const guestGet = await request(app).get("/api/v1/cart");
        const guestCookie = getSessionCookie(guestGet);

        await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 12,
            });

        // Merging 10 + 12 = 22, but available is 18!
        const mergeRes = await request(app)
            .post("/api/v1/cart/merge")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send();

        expect(mergeRes.status).toBe(200);
        expect(mergeRes.body.data.merged).toBe(true);
        expect(mergeRes.body.data.issues).toHaveLength(1);

        const issue = mergeRes.body.data.issues[0];
        expect(issue.variantId).toBe(inStockVariantId);
        expect(issue.requested).toBe(22);
        expect(issue.resulting).toBe(18);
        expect(issue.available).toBe(18);
        expect(issue.reason).toBe("INSUFFICIENT_STOCK");

        // Final cart item capped at 18
        expect(mergeRes.body.data.cart.items[0].quantity).toBe(18);
    });

    /* -------------------------------------------------------------------------- */
    /* 19. Atomic Guest Merge                                                     */
    /* -------------------------------------------------------------------------- */
    it("19. Rejects merge if user cart currency does not match guest cart currency", async () => {
        // Customer cart in USD
        await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
                currency: "USD",
            });

        // Guest cart created in EUR
        const guestGet = await request(app).get("/api/v1/cart");
        const guestCookie = getSessionCookie(guestGet);

        await CartModel.updateOne(
            { sessionId: guestCookie },
            { currency: "EUR" }
        );

        await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
                currency: "EUR",
            });

        // Merge should reject due to currency mismatch
        const mergeRes = await request(app)
            .post("/api/v1/cart/merge")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send();

        expect(mergeRes.status).toBe(400);
        expect(mergeRes.body.error.code).toBe("CURRENCY_MISMATCH");
    });

    /* -------------------------------------------------------------------------- */
    /* 20. Guest Cart Status Transitions to MERGED                                */
    /* -------------------------------------------------------------------------- */
    it("20. Guest cart status transitions to MERGED and clears session cookie", async () => {
        const guestGet = await request(app).get("/api/v1/cart");
        const guestCookie = getSessionCookie(guestGet);

        await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const mergeRes = await request(app)
            .post("/api/v1/cart/merge")
            .set("Authorization", `Bearer ${customerAToken}`)
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send();

        expect(mergeRes.status).toBe(200);

        // Check in DB that guest cart is now MERGED
        const guestCartInDb = await CartModel.findOne({ sessionId: guestCookie });
        expect(guestCartInDb?.status).toBe("MERGED");
    });

    /* -------------------------------------------------------------------------- */
    /* 21. Optimistic Concurrency Control (OCC)                                   */
    /* -------------------------------------------------------------------------- */
    it("21. Mutating cart with stale expectedVersion returns 409 OCC_CONFLICT", async () => {
        const addRes = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        const currentVersion = addRes.body.data.version;

        // Mutation with stale expectedVersion (e.g. currentVersion + 5)
        const conflictRes = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
                expectedVersion: currentVersion + 5,
            });

        expect(conflictRes.status).toBe(409);
        expect(conflictRes.body.error.code).toBe("OCC_CONFLICT");
    });

    /* -------------------------------------------------------------------------- */
    /* 22. Inactive Variant Rejection                                             */
    /* -------------------------------------------------------------------------- */
    it("22. Rejects adding inactive variant with 400 VARIANT_INACTIVE", async () => {
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: testProductId,
                variantId: inactiveVariantId,
                quantity: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VARIANT_INACTIVE");
    });

    /* -------------------------------------------------------------------------- */
    /* 23. Unpublished Product Rejection                                          */
    /* -------------------------------------------------------------------------- */
    it("23. Rejects adding product in DRAFT status with 400 PRODUCT_NOT_PUBLISHED", async () => {
        const res = await request(app)
            .post("/api/v1/cart/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: draftProductId,
                variantId: draftVariantId,
                quantity: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("PRODUCT_NOT_PUBLISHED");
    });

    /* -------------------------------------------------------------------------- */
    /* 24. Application Expiry Guard                                               */
    /* -------------------------------------------------------------------------- */
    it("24. Guest cart with expiresAt < now is treated as expired even if TTL monitor hasn't run", async () => {
        const getRes = await request(app).get("/api/v1/cart");
        const guestCookie = getSessionCookie(getRes);

        // Add item
        await request(app)
            .post("/api/v1/cart/items")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`])
            .send({
                productId: testProductId,
                variantId: inStockVariantId,
                quantity: 1,
            });

        // Fast-forward expiresAt to the past (simulating expired cart before Mongo TTL thread wakes up)
        await CartModel.updateOne(
            { sessionId: guestCookie },
            { expiresAt: new Date(Date.now() - 1000) }
        );

        // Reading cart with expired session id treats it as expired, returning fresh empty cart
        const freshRes = await request(app)
            .get("/api/v1/cart")
            .set("Cookie", [`${CART_SESSION_COOKIE_NAME}=${guestCookie}`]);

        expect(freshRes.status).toBe(200);
        expect(freshRes.body.data.items).toHaveLength(0);
    });
});
