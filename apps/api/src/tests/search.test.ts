import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import { InventoryModel } from "../modules/inventory/models/inventory.model.js";

describe("Search & Discovery Engine Integration Tests", () => {
    let rootCategoryId: string;
    let audioCategoryId: string;
    let wearablesCategoryId: string;
    let homeCategoryId: string;

    let productSonyHeadphonesId: string;
    let productAppleAirPodsId: string;
    let productAppleWatchId: string;
    let productBudgetEarbudsId: string;
    let productDraftDroneId: string;
    let productArchivedMp3Id: string;

    beforeAll(async () => {
        await connectDatabase();
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});

        // 1. Setup Categories Hierarchy
        // Root: Electronics
        const rootCat = await CategoryModel.create({
            name: "Electronics Search",
            slug: "electronics-search",
            isActive: true,
            parentId: null,
            ancestors: [],
        });
        rootCategoryId = rootCat._id.toString();

        // Child: Audio (descendant of Electronics)
        const audioCat = await CategoryModel.create({
            name: "Audio Search",
            slug: "audio-search",
            isActive: true,
            parentId: rootCat._id,
            ancestors: [rootCat._id],
        });
        audioCategoryId = audioCat._id.toString();

        // Child: Wearables (descendant of Electronics)
        const wearablesCat = await CategoryModel.create({
            name: "Wearables Search",
            slug: "wearables-search",
            isActive: true,
            parentId: rootCat._id,
            ancestors: [rootCat._id],
        });
        wearablesCategoryId = wearablesCat._id.toString();

        // Sibling Root: Home & Kitchen
        const homeCat = await CategoryModel.create({
            name: "Home & Kitchen Search",
            slug: "home-kitchen-search",
            isActive: true,
            parentId: null,
            ancestors: [],
        });
        homeCategoryId = homeCat._id.toString();

        // 2. Setup Products
        const warehouseId = new Types.ObjectId();

        // Product 1: Sony WH-1000XM5 Headphones (Audio, Published, In-Stock, Rating: 4.8)
        const sonyVariantId = new Types.ObjectId().toString();
        const pSony = await ProductModel.create({
            title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
            slug: "sony-wh-1000xm5-search",
            description: "Premium over-ear noise cancelling headphones with LDAC.",
            brand: "Sony",
            categoryId: audioCat._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            thumbnail: "https://images.shopsphere.test/sony-xm5.png",
            averageRating: 4.8,
            reviewCount: 25,
            tags: ["audio", "headphones", "noise-cancelling", "wireless"],
            variants: [
                {
                    id: sonyVariantId,
                    sku: "SONY-XM5-BLK",
                    title: "Black",
                    prices: [
                        { currency: "USD", amount: 349.99, compareAtAmount: 399.99 },
                        { currency: "EUR", amount: 319.99 },
                    ],
                    isActive: true,
                },
            ],
        });
        productSonyHeadphonesId = pSony._id.toString();

        await InventoryModel.create({
            productId: pSony._id,
            variantId: new Types.ObjectId(sonyVariantId),
            warehouseId,
            onHand: 15,
            reserved: 0,
            safetyStock: 1,
            reorderThreshold: 3,
            allowBackorder: false,
            version: 1,
        });

        // Product 2: Apple AirPods Max (Audio, Published, In-Stock, Rating: 4.5)
        const airpodsVariantId = new Types.ObjectId().toString();
        const pAirPods = await ProductModel.create({
            title: "Apple AirPods Max Wireless Over-Ear Headphones",
            slug: "apple-airpods-max-search",
            description: "High-fidelity audio with active noise cancellation and transparency mode.",
            brand: "Apple",
            categoryId: audioCat._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            thumbnail: "https://images.shopsphere.test/airpods-max.png",
            averageRating: 4.5,
            reviewCount: 40,
            tags: ["audio", "apple", "headphones", "premium"],
            variants: [
                {
                    id: airpodsVariantId,
                    sku: "APP-AIRPODS-MAX",
                    title: "Space Gray",
                    prices: [
                        { currency: "USD", amount: 549.0, compareAtAmount: 599.0 },
                        { currency: "EUR", amount: 510.0 },
                    ],
                    isActive: true,
                },
            ],
        });
        productAppleAirPodsId = pAirPods._id.toString();

        await InventoryModel.create({
            productId: pAirPods._id,
            variantId: new Types.ObjectId(airpodsVariantId),
            warehouseId,
            onHand: 5,
            reserved: 0,
            safetyStock: 0,
            reorderThreshold: 2,
            allowBackorder: false,
            version: 1,
        });

        // Product 3: Apple Watch Ultra 2 (Wearables, Published, In-Stock, Rating: 4.9)
        const watchVariantId = new Types.ObjectId().toString();
        const pWatch = await ProductModel.create({
            title: "Apple Watch Ultra 2 Rugged Smartwatch",
            slug: "apple-watch-ultra-2-search",
            description: "Rugged titanium case with precision dual-frequency GPS.",
            brand: "Apple",
            categoryId: wearablesCat._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            thumbnail: "https://images.shopsphere.test/apple-watch.png",
            averageRating: 4.9,
            reviewCount: 12,
            tags: ["smartwatch", "wearables", "apple", "fitness"],
            variants: [
                {
                    id: watchVariantId,
                    sku: "APP-WATCH-ULTRA2",
                    title: "Titanium Orange",
                    prices: [
                        { currency: "USD", amount: 799.0 },
                        { currency: "EUR", amount: 750.0 },
                    ],
                    isActive: true,
                },
            ],
        });
        productAppleWatchId = pWatch._id.toString();

        await InventoryModel.create({
            productId: pWatch._id,
            variantId: new Types.ObjectId(watchVariantId),
            warehouseId,
            onHand: 8,
            reserved: 0,
            safetyStock: 1,
            reorderThreshold: 2,
            allowBackorder: false,
            version: 1,
        });

        // Product 4: Budget Wired Earbuds (Audio, Published, OUT-OF-STOCK, Rating: 3.2)
        const budgetVariantId = new Types.ObjectId().toString();
        const pBudget = await ProductModel.create({
            title: "Basic In-Ear Wired Earbuds",
            slug: "basic-in-ear-wired-earbuds-search",
            description: "Affordable 3.5mm wired earphones with built-in microphone.",
            brand: "GenericAudio",
            categoryId: audioCat._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            thumbnail: "https://images.shopsphere.test/basic-earbuds.png",
            averageRating: 3.2,
            reviewCount: 8,
            tags: ["earbuds", "budget", "wired"],
            variants: [
                {
                    id: budgetVariantId,
                    sku: "GEN-EARBUDS-WIR",
                    title: "Black",
                    prices: [
                        { currency: "USD", amount: 19.99 },
                        { currency: "EUR", amount: 18.0 },
                    ],
                    isActive: true,
                },
            ],
        });
        productBudgetEarbudsId = pBudget._id.toString();

        // Zero inventory, no backorder -> Out of Stock
        await InventoryModel.create({
            productId: pBudget._id,
            variantId: new Types.ObjectId(budgetVariantId),
            warehouseId,
            onHand: 0,
            reserved: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });

        // Product 5: DRAFT Product (Should NEVER appear in search results)
        const draftVariantId = new Types.ObjectId().toString();
        const pDraft = await ProductModel.create({
            title: "Unreleased AeroDrone Pro Camera",
            slug: "unreleased-aerodrone-pro-search",
            description: "Concept commercial quadcopter drone.",
            brand: "AeroTech",
            categoryId: rootCat._id,
            baseCurrency: "USD",
            status: "DRAFT",
            averageRating: 0,
            variants: [
                {
                    id: draftVariantId,
                    sku: "DRONE-CONCEPT",
                    title: "Standard",
                    prices: [{ currency: "USD", amount: 999.0 }],
                    isActive: true,
                },
            ],
        });
        productDraftDroneId = pDraft._id.toString();

        // Product 6: ARCHIVED Product (Should NEVER appear in search results)
        const archivedVariantId = new Types.ObjectId().toString();
        const pArchived = await ProductModel.create({
            title: "Vintage Sony Walkman Cassette Player",
            slug: "vintage-sony-walkman-search",
            description: "Vintage retro cassette player.",
            brand: "Sony",
            categoryId: audioCat._id,
            baseCurrency: "USD",
            status: "ARCHIVED",
            averageRating: 4.0,
            variants: [
                {
                    id: archivedVariantId,
                    sku: "SONY-RETRO-WALK",
                    title: "Silver",
                    prices: [{ currency: "USD", amount: 49.0 }],
                    isActive: true,
                },
            ],
        });
        productArchivedMp3Id = pArchived._id.toString();

        // Ensure text index is created and populated on ProductModel
        await ProductModel.init();
    }, 180000);

    afterAll(async () => {
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await disconnectDatabase();
    });

    // --------------------------------------------------------------------------
    // Scenario 1: Keyword Relevance
    // --------------------------------------------------------------------------
    it("Scenario 1: Returns relevant items matching text search keyword with scores", async () => {
        const res = await request(app).get("/api/v1/search?q=Headphones");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

        // All matched items should have keyword in title or description
        for (const item of res.body.data.items) {
            const matchesText =
                item.title.toLowerCase().includes("headphones") ||
                item.slug.toLowerCase().includes("headphones");
            expect(matchesText).toBe(true);
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 2: Published Products Only
    // --------------------------------------------------------------------------
    it("Scenario 2: Strictly excludes DRAFT and ARCHIVED products from search results", async () => {
        // Querying for 'AeroDrone' (which is DRAFT)
        const resDraft = await request(app).get("/api/v1/search?q=AeroDrone");
        expect(resDraft.status).toBe(200);
        expect(resDraft.body.data.items).toHaveLength(0);

        // Querying for 'Walkman' (which is ARCHIVED)
        const resArchived = await request(app).get("/api/v1/search?q=Walkman");
        expect(resArchived.status).toBe(200);
        expect(resArchived.body.data.items).toHaveLength(0);

        // General search should only contain published IDs
        const resAll = await request(app).get("/api/v1/search");
        const returnedIds = resAll.body.data.items.map((i: any) => i.id);
        expect(returnedIds).not.toContain(productDraftDroneId);
        expect(returnedIds).not.toContain(productArchivedMp3Id);
    });

    // --------------------------------------------------------------------------
    // Scenario 3: Category Filtering (Hierarchy Support)
    // --------------------------------------------------------------------------
    it("Scenario 3: Resolves category hierarchy (returns parent category and descendant subcategories)", async () => {
        // Searching under root category 'Electronics' should return items in 'Audio' and 'Wearables'
        const resRoot = await request(app).get(`/api/v1/search?categoryId=${rootCategoryId}`);
        expect(resRoot.status).toBe(200);
        expect(resRoot.body.data.items.length).toBe(4); // Sony, AirPods Max, Apple Watch, Budget Earbuds

        // Searching specifically under subcategory 'Audio' should return 3 audio products
        const resAudio = await request(app).get(`/api/v1/search?categoryId=${audioCategoryId}`);
        expect(resAudio.status).toBe(200);
        expect(resAudio.body.data.items).toHaveLength(3);
        for (const item of resAudio.body.data.items) {
            expect(item.categoryId).toBe(audioCategoryId);
        }

        // Searching under an empty category returns 0 items
        const resHome = await request(app).get(`/api/v1/search?categoryId=${homeCategoryId}`);
        expect(resHome.status).toBe(200);
        expect(resHome.body.data.items).toHaveLength(0);
    });

    // --------------------------------------------------------------------------
    // Scenario 4: Brand Filtering
    // --------------------------------------------------------------------------
    it("Scenario 4: Filters catalog by exact brand (case-insensitive)", async () => {
        const resApple = await request(app).get("/api/v1/search?brand=Apple");
        expect(resApple.status).toBe(200);
        expect(resApple.body.data.items).toHaveLength(2);
        for (const item of resApple.body.data.items) {
            expect(item.brand).toBe("Apple");
        }

        const resSony = await request(app).get("/api/v1/search?brand=sony");
        expect(resSony.status).toBe(200);
        expect(resSony.body.data.items).toHaveLength(1);
        expect(resSony.body.data.items[0].id).toBe(productSonyHeadphonesId);
    });

    // --------------------------------------------------------------------------
    // Scenario 5: Price + Currency Filtering
    // --------------------------------------------------------------------------
    it("Scenario 5: Filters products strictly by minPrice/maxPrice in the requested currency", async () => {
        // USD bounds: minPrice: 200, maxPrice: 600
        // Expect: Sony ($349.99) and AirPods Max ($549.00)
        // Exclude: Budget ($19.99) and Apple Watch ($799.00)
        const resUsd = await request(app).get(
            "/api/v1/search?minPrice=200&maxPrice=600&currency=USD"
        );
        expect(resUsd.status).toBe(200);
        expect(resUsd.body.data.items).toHaveLength(2);
        const titles = resUsd.body.data.items.map((i: any) => i.title);
        expect(titles).toContain("Sony WH-1000XM5 Wireless Noise Cancelling Headphones");
        expect(titles).toContain("Apple AirPods Max Wireless Over-Ear Headphones");
        for (const item of resUsd.body.data.items) {
            expect(item.price.amount).toBeGreaterThanOrEqual(200);
            expect(item.price.amount).toBeLessThanOrEqual(600);
            expect(item.price.currency).toBe("USD");
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 6: Rating Filtering
    // --------------------------------------------------------------------------
    it("Scenario 6: Filters catalog by minimum average rating", async () => {
        // minRating: 4.7 -> Apple Watch (4.9) and Sony (4.8)
        const resRating = await request(app).get("/api/v1/search?minRating=4.7");
        expect(resRating.status).toBe(200);
        expect(resRating.body.data.items).toHaveLength(2);
        for (const item of resRating.body.data.items) {
            expect(item.averageRating).toBeGreaterThanOrEqual(4.7);
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 7: In-Stock Filtering
    // --------------------------------------------------------------------------
    it("Scenario 7: Read-only inventory filtering isolates in-stock vs out-of-stock items", async () => {
        // inStock: true -> Should exclude Budget Earbuds (which has 0 available inventory)
        const resInStock = await request(app).get("/api/v1/search?inStock=true");
        expect(resInStock.status).toBe(200);
        expect(resInStock.body.data.items).toHaveLength(3);
        for (const item of resInStock.body.data.items) {
            expect(item.inStock).toBe(true);
            expect(item.id).not.toBe(productBudgetEarbudsId);
        }

        // inStock: false -> Should return only out-of-stock items (Budget Earbuds)
        const resOutOfStock = await request(app).get("/api/v1/search?inStock=false");
        expect(resOutOfStock.status).toBe(200);
        expect(resOutOfStock.body.data.items).toHaveLength(1);
        expect(resOutOfStock.body.data.items[0].id).toBe(productBudgetEarbudsId);
        expect(resOutOfStock.body.data.items[0].inStock).toBe(false);
    });

    // --------------------------------------------------------------------------
    // Scenario 8: Sorting
    // --------------------------------------------------------------------------
    it("Scenario 8: Correctly orders catalog results by price, rating, and newest", async () => {
        // 1. Price Ascending: 19.99 -> 349.99 -> 549.00 -> 799.00
        const resPriceAsc = await request(app).get("/api/v1/search?sortBy=price_asc&currency=USD");
        expect(resPriceAsc.status).toBe(200);
        const pricesAsc = resPriceAsc.body.data.items.map((i: any) => i.price.amount);
        for (let i = 0; i < pricesAsc.length - 1; i++) {
            expect(pricesAsc[i]).toBeLessThanOrEqual(pricesAsc[i + 1]);
        }

        // 2. Price Descending: 799.00 -> 549.00 -> 349.99 -> 19.99
        const resPriceDesc = await request(app).get("/api/v1/search?sortBy=price_desc&currency=USD");
        expect(resPriceDesc.status).toBe(200);
        const pricesDesc = resPriceDesc.body.data.items.map((i: any) => i.price.amount);
        for (let i = 0; i < pricesDesc.length - 1; i++) {
            expect(pricesDesc[i]).toBeGreaterThanOrEqual(pricesDesc[i + 1]);
        }

        // 3. Rating Descending: 4.9 -> 4.8 -> 4.5 -> 3.2
        const resRating = await request(app).get("/api/v1/search?sortBy=rating");
        expect(resRating.status).toBe(200);
        const ratings = resRating.body.data.items.map((i: any) => i.averageRating);
        for (let i = 0; i < ratings.length - 1; i++) {
            expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 9: Bounded Pagination
    // --------------------------------------------------------------------------
    it("Scenario 9: Returns bounded pagination slices and accurate total metadata", async () => {
        // Page 1 with limit 2
        const resPage1 = await request(app).get("/api/v1/search?page=1&limit=2");
        expect(resPage1.status).toBe(200);
        expect(resPage1.body.data.items).toHaveLength(2);
        expect(resPage1.body.data.pagination.page).toBe(1);
        expect(resPage1.body.data.pagination.limit).toBe(2);
        expect(resPage1.body.data.pagination.total).toBe(4);
        expect(resPage1.body.data.pagination.totalPages).toBe(2);

        // Page 2 with limit 2
        const resPage2 = await request(app).get("/api/v1/search?page=2&limit=2");
        expect(resPage2.status).toBe(200);
        expect(resPage2.body.data.items).toHaveLength(2);
        expect(resPage2.body.data.pagination.page).toBe(2);

        // Items on page 1 and page 2 should be distinct
        const page1Ids = resPage1.body.data.items.map((i: any) => i.id);
        const page2Ids = resPage2.body.data.items.map((i: any) => i.id);
        for (const id of page1Ids) {
            expect(page2Ids).not.toContain(id);
        }
    });

    // --------------------------------------------------------------------------
    // Scenario 10: Combined Filters & Facets Return
    // --------------------------------------------------------------------------
    it("Scenario 10: Multi-facet combination and facet aggregations return expected structures", async () => {
        // Brand: Apple, Price range: 500 to 600, Currency: USD, InStock: true
        const res = await request(app).get(
            "/api/v1/search?brand=Apple&minPrice=500&maxPrice=600&currency=USD&inStock=true"
        );

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(1);
        expect(res.body.data.items[0].id).toBe(productAppleAirPodsId);

        // Verify facets format in response
        const facets = res.body.data.facets;
        expect(facets).toBeDefined();
        expect(facets.brands).toBeInstanceOf(Array);
        expect(facets.categories).toBeInstanceOf(Array);
        expect(facets.price).toBeDefined();
        expect(facets.price.min).toBe(549);
        expect(facets.price.max).toBe(549);
    });

    // --------------------------------------------------------------------------
    // Scenario 11: Empty Results
    // --------------------------------------------------------------------------
    it("Scenario 11: Returns empty items and zeroed pagination gracefully when no products match", async () => {
        const res = await request(app).get("/api/v1/search?q=NonExistentSuperGadgetXyz123");

        expect(res.status).toBe(200);
        expect(res.body.data.items).toHaveLength(0);
        expect(res.body.data.pagination.total).toBe(0);
        expect(res.body.data.pagination.totalPages).toBe(0);
        expect(res.body.data.facets.brands).toHaveLength(0);
    });

    // --------------------------------------------------------------------------
    // Scenario 12: Invalid Query Validation
    // --------------------------------------------------------------------------
    it("Scenario 12: Rejects invalid query parameters with 400 Bad Request", async () => {
        // minPrice > maxPrice
        const resPrice = await request(app).get("/api/v1/search?minPrice=500&maxPrice=100");
        expect(resPrice.status).toBe(400);
        expect(resPrice.body.error.code).toBe("VALIDATION_ERROR");

        // limit > 50
        const resLimit = await request(app).get("/api/v1/search?limit=100");
        expect(resLimit.status).toBe(400);
        expect(resLimit.body.error.code).toBe("VALIDATION_ERROR");

        // currency invalid length
        const resCurr = await request(app).get("/api/v1/search?currency=USDOLLARS");
        expect(resCurr.status).toBe(400);
        expect(resCurr.body.error.code).toBe("VALIDATION_ERROR");

        // categoryId invalid ObjectId format
        const resCat = await request(app).get("/api/v1/search?categoryId=not-valid-id");
        expect(resCat.status).toBe(400);
        expect(resCat.body.error.code).toBe("VALIDATION_ERROR");
    });
});
