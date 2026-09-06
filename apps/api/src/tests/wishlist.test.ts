import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import { InventoryModel } from "../modules/inventory/models/inventory.model.js";
import { CartModel } from "../modules/cart/models/cart.model.js";
import { WishlistModel } from "../modules/wishlist/models/wishlist.model.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";

describe("Wishlist Module Integration Tests", () => {
    let customerAToken: string;
    let customerBToken: string;

    let customerAId: string;
    let customerBId: string;

    let testCategoryId: string;
    let publishedProductId: string;
    let draftProductId: string;

    let inStockVariantId: string;
    let backorderVariantId: string;
    let inactiveVariantId: string;
    let draftVariantId: string;

    beforeAll(async () => {
        await connectDatabase();
        await WishlistModel.deleteMany({});
        await CartModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // 1. Register Customer A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "wishlist.alice@ecommers.test",
                password: "Password123!",
                firstName: "Alice",
                lastName: "Wishlist",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "wishlist.alice@ecommers.test",
                password: "Password123!",
            });
        customerAToken = loginA.body.data.accessToken;

        // 2. Register Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "wishlist.bob@ecommers.test",
                password: "Password123!",
                firstName: "Bob",
                lastName: "Wishlist",
            });
        customerBId = regB.body.data.id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "wishlist.bob@ecommers.test",
                password: "Password123!",
            });
        customerBToken = loginB.body.data.accessToken;

        // 3. Create Test Category
        const category = await CategoryModel.create({
            name: "Electronics Wishlist",
            slug: "electronics-wishlist",
            isActive: true,
        });
        testCategoryId = category._id.toString();

        // 4. Create Published Product with multiple variants
        inStockVariantId = new Types.ObjectId().toString();
        backorderVariantId = new Types.ObjectId().toString();
        inactiveVariantId = new Types.ObjectId().toString();

        const product = await ProductModel.create({
            title: "Pro Noise-Cancelling Headphones",
            slug: "pro-noise-cancelling-headphones-wishlist",
            description: "Industry-leading noise cancelling with premium sound quality.",
            brand: "AcousticPro",
            categoryId: new Types.ObjectId(testCategoryId),
            baseCurrency: "USD",
            status: "PUBLISHED",
            thumbnail: "https://images.ecommers.test/headphones-thumb.png",
            images: [
                "https://images.ecommers.test/headphones-thumb.png",
                "https://images.ecommers.test/headphones-side.png",
            ],
            variants: [
                {
                    id: inStockVariantId,
                    sku: "HP-PRO-BLK",
                    title: "Matte Black",
                    prices: [
                        { currency: "USD", amount: 299.99, compareAtAmount: 349.99 },
                        { currency: "EUR", amount: 279.99 },
                    ],
                    isActive: true,
                },
                {
                    id: backorderVariantId,
                    sku: "HP-PRO-SLV",
                    title: "Silver Metallic",
                    prices: [
                        { currency: "USD", amount: 309.99 },
                    ],
                    isActive: true,
                },
                {
                    id: inactiveVariantId,
                    sku: "HP-PRO-GLD",
                    title: "Limited Gold",
                    prices: [
                        { currency: "USD", amount: 399.99 },
                    ],
                    isActive: false, // Inactive variant
                },
            ],
        });
        publishedProductId = product._id.toString();

        // 5. Create Draft Product
        draftVariantId = new Types.ObjectId().toString();
        const draftProduct = await ProductModel.create({
            title: "Unreleased Earbuds",
            slug: "unreleased-earbuds-wishlist",
            description: "Concept earbuds not yet released.",
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
        const warehouseId = new Types.ObjectId();

        // In-stock item: 20 on hand, 0 reserved, 2 safety -> 18 available
        await InventoryModel.create({
            productId: product._id,
            variantId: new Types.ObjectId(inStockVariantId),
            warehouseId,
            onHand: 20,
            reserved: 0,
            backordered: 0,
            safetyStock: 2,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });

        // Backorder item: 0 on hand, 0 reserved, 0 safety -> 0 available, allowBackorder: true
        await InventoryModel.create({
            productId: product._id,
            variantId: new Types.ObjectId(backorderVariantId),
            warehouseId,
            onHand: 0,
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: true,
            version: 1,
        });
    });

    afterAll(async () => {
        await WishlistModel.deleteMany({});
        await CartModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    // --------------------------------------------------------------------------
    // Scenario 1: Unauthenticated access rejected
    // --------------------------------------------------------------------------
    it("Scenario 1: Unauthenticated requests to wishlist endpoints are rejected with 401", async () => {
        const getRes = await request(app).get("/api/v1/wishlist");
        expect(getRes.status).toBe(401);

        const addRes = await request(app)
            .post("/api/v1/wishlist/items")
            .send({ productId: publishedProductId, variantId: inStockVariantId });
        expect(addRes.status).toBe(401);

        const delRes = await request(app).delete(`/api/v1/wishlist/items/${inStockVariantId}`);
        expect(delRes.status).toBe(401);

        const moveRes = await request(app)
            .post(`/api/v1/wishlist/items/${inStockVariantId}/move-to-cart`)
            .send({});
        expect(moveRes.status).toBe(401);

        const clearRes = await request(app).delete("/api/v1/wishlist");
        expect(clearRes.status).toBe(401);
    });

    // --------------------------------------------------------------------------
    // Scenario 2: Add item to wishlist
    // --------------------------------------------------------------------------
    it("Scenario 2: Authenticated customer can add an item to their wishlist", async () => {
        const res = await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: inStockVariantId,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.itemCount).toBe(1);
        expect(res.body.data.items).toHaveLength(1);

        const item = res.body.data.items[0];
        expect(item.productId).toBe(publishedProductId);
        expect(item.variantId).toBe(inStockVariantId);
        expect(item.title).toBe("Pro Noise-Cancelling Headphones");
        expect(item.sku).toBe("HP-PRO-BLK");
    });

    // --------------------------------------------------------------------------
    // Scenario 3: Duplicate item does not create duplicate entry
    // --------------------------------------------------------------------------
    it("Scenario 3: Adding a duplicate item is idempotent and does not create duplicate entries", async () => {
        const res = await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: inStockVariantId,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.itemCount).toBe(1);
        expect(res.body.data.items).toHaveLength(1);

        // Verify directly in database
        const dbWishlist = await WishlistModel.findOne({ userId: customerAId });
        expect(dbWishlist).not.toBeNull();
        expect(dbWishlist!.items).toHaveLength(1);
    });

    // --------------------------------------------------------------------------
    // Scenario 4: Remove item from wishlist
    // --------------------------------------------------------------------------
    it("Scenario 4: Customer can remove an item from their wishlist by variantId", async () => {
        // First add a second item (backorder variant)
        await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: backorderVariantId,
            });

        const checkBefore = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(checkBefore.body.data.itemCount).toBe(2);

        // Remove backorder variant
        const deleteRes = await request(app)
            .delete(`/api/v1/wishlist/items/${backorderVariantId}`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.data.itemCount).toBe(1);
        expect(deleteRes.body.data.items[0].variantId).toBe(inStockVariantId);
    });

    // --------------------------------------------------------------------------
    // Scenario 5: Current product/price/availability resolved correctly
    // --------------------------------------------------------------------------
    it("Scenario 5: Resolves live product catalog info, preferred currency price, and inventory status", async () => {
        // Query with default USD
        const resUsd = await request(app)
            .get("/api/v1/wishlist?currency=USD")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(resUsd.status).toBe(200);
        const itemUsd = resUsd.body.data.items[0];
        expect(itemUsd.title).toBe("Pro Noise-Cancelling Headphones");
        expect(itemUsd.slug).toBe("pro-noise-cancelling-headphones-wishlist");
        expect(itemUsd.thumbnail).toBe("https://images.ecommers.test/headphones-thumb.png");
        expect(itemUsd.price.currency).toBe("USD");
        expect(itemUsd.price.amount).toBe(299.99);
        expect(itemUsd.price.compareAtAmount).toBe(349.99);
        expect(itemUsd.inventory.inStock).toBe(true);
        expect(itemUsd.inventory.availableQuantity).toBe(18);

        // Query with EUR currency
        const resEur = await request(app)
            .get("/api/v1/wishlist?currency=EUR")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(resEur.status).toBe(200);
        const itemEur = resEur.body.data.items[0];
        expect(itemEur.price.currency).toBe("EUR");
        expect(itemEur.price.amount).toBe(279.99);
    });

    // --------------------------------------------------------------------------
    // Scenario 6: Move to cart
    // --------------------------------------------------------------------------
    it("Scenario 6: Move to cart coordinates with CartService, adds to cart, and removes from wishlist", async () => {
        // Customer A moves inStockVariantId to cart with quantity 2
        const moveRes = await request(app)
            .post(`/api/v1/wishlist/items/${inStockVariantId}/move-to-cart`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                quantity: 2,
                currency: "USD",
            });

        expect(moveRes.status).toBe(200);
        expect(moveRes.body.success).toBe(true);

        // Verify cart response
        const cart = moveRes.body.data.cart;
        expect(cart).toBeDefined();
        expect(cart.items).toHaveLength(1);
        expect(cart.items[0].variantId).toBe(inStockVariantId);
        expect(cart.items[0].quantity).toBe(2);

        // Verify wishlist response (item removed)
        const wishlist = moveRes.body.data.wishlist;
        expect(wishlist.itemCount).toBe(0);
        expect(wishlist.items).toHaveLength(0);

        // Verify GET /api/v1/wishlist shows empty
        const getWishlist = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(getWishlist.body.data.itemCount).toBe(0);
    });

    // --------------------------------------------------------------------------
    // Scenario 7: Move-to-cart handles unavailable/inactive variant
    // --------------------------------------------------------------------------
    it("Scenario 7: Move-to-cart rejects inactive variants and preserves wishlist item on failure", async () => {
        // Add inactive variant to wishlist
        const addRes = await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: inactiveVariantId,
            });
        try {
            expect(addRes.status).toBe(201);
            expect(addRes.body.data.itemCount).toBe(1);

            // Try to move inactive variant to cart
            const moveRes = await request(app)
                .post(`/api/v1/wishlist/items/${inactiveVariantId}/move-to-cart`)
                .set("Authorization", `Bearer ${customerAToken}`)
                .send({ quantity: 1 });

            expect(moveRes.status).toBe(400);
            expect(moveRes.body.error.code).toBe("VARIANT_INACTIVE");

            // Verify that item remains in wishlist since cart addition failed
            const getWishlist = await request(app)
                .get("/api/v1/wishlist")
                .set("Authorization", `Bearer ${customerAToken}`);
            expect(getWishlist.body.data.itemCount).toBe(1);
            expect(getWishlist.body.data.items[0].variantId).toBe(inactiveVariantId);
        } finally {
            // Clean up inactive item
            await request(app)
                .delete(`/api/v1/wishlist/items/${inactiveVariantId}`)
                .set("Authorization", `Bearer ${customerAToken}`);
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 8: Wishlist belongs only to authenticated customer (Isolation)
    // --------------------------------------------------------------------------
    it("Scenario 8: Wishlists are strictly isolated per authenticated customer", async () => {
        // Customer A adds inStockVariantId
        await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: inStockVariantId,
            });

        // Customer B checks wishlist -> should be empty
        const bobWishlistBefore = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerBToken}`);
        expect(bobWishlistBefore.body.data.itemCount).toBe(0);

        // Customer B adds backorderVariantId
        await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerBToken}`)
            .send({
                productId: publishedProductId,
                variantId: backorderVariantId,
            });

        const bobWishlistAfter = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerBToken}`);
        expect(bobWishlistAfter.body.data.itemCount).toBe(1);
        expect(bobWishlistAfter.body.data.items[0].variantId).toBe(backorderVariantId);

        // Customer A still only has inStockVariantId
        const aliceWishlist = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(aliceWishlist.body.data.itemCount).toBe(1);
        expect(aliceWishlist.body.data.items[0].variantId).toBe(inStockVariantId);
    });

    // --------------------------------------------------------------------------
    // Scenario 9: Clear wishlist
    // --------------------------------------------------------------------------
    it("Scenario 9: Customer can clear all items from their wishlist", async () => {
        // Customer A adds second item
        await request(app)
            .post("/api/v1/wishlist/items")
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                productId: publishedProductId,
                variantId: backorderVariantId,
            });

        const beforeClear = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(beforeClear.body.data.itemCount).toBe(2);

        // Clear wishlist
        const clearRes = await request(app)
            .delete("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(clearRes.status).toBe(200);
        expect(clearRes.body.data.itemCount).toBe(0);
        expect(clearRes.body.data.items).toHaveLength(0);

        // Verify GET returns empty
        const afterClear = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);
        expect(afterClear.body.data.itemCount).toBe(0);
    });

    // --------------------------------------------------------------------------
    // Scenario 10: Concurrent add operations safety
    // --------------------------------------------------------------------------
    it("Scenario 10: Concurrently adding the same variant maintains consistency and prevents duplicate entries", async () => {
        // Clear wishlist before concurrent test
        await request(app)
            .delete("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);

        // Concurrently fire 5 identical add requests for Customer A
        const promises = Array.from({ length: 5 }).map(() =>
            request(app)
                .post("/api/v1/wishlist/items")
                .set("Authorization", `Bearer ${customerAToken}`)
                .send({
                    productId: publishedProductId,
                    variantId: inStockVariantId,
                })
        );

        const results = await Promise.all(promises);

        for (const res of results) {
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        }

        // Verify final state has exactly 1 item
        const finalGet = await request(app)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(finalGet.body.data.itemCount).toBe(1);
        expect(finalGet.body.data.items).toHaveLength(1);
        expect(finalGet.body.data.items[0].variantId).toBe(inStockVariantId);

        // Verify database level
        const dbDoc = await WishlistModel.findOne({ userId: customerAId });
        expect(dbDoc!.items).toHaveLength(1);
    });
});
