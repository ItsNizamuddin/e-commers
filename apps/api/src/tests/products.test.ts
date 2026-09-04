import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";

describe("Product & Catalog Module Integration Tests", () => {
    let superAdminToken: string;
    let supportToken: string;
    let customerToken: string;
    let produceCategoryId: string;
    let fruitsCategoryId: string;
    let appleProductId: string;
    let appleProductSlug: string;

    beforeAll(async () => {
        await connectDatabase();
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // 1. Log in Super Admin
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        superAdminToken = adminLogin.body.data.accessToken;

        // 2. Create and log in Support Agent (staff with product.read, but without product.update)
        await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                email: "support@shopsphere.com",
                password: "Password123!",
                firstName: "Support",
                lastName: "Agent",
                role: "SUPPORT_AGENT",
            });

        const supportLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "support@shopsphere.com",
                password: "Password123!",
            });
        supportToken = supportLogin.body.data.accessToken;

        // 3. Register & log in Customer
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer@example.com",
                password: "Password123!",
                firstName: "Regular",
                lastName: "Shopper",
            });

        const custLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer@example.com",
                password: "Password123!",
            });
        customerToken = custLogin.body.data.accessToken;

        // 4. Create Category hierarchy: Produce (parent) -> Fruits (child)
        const produceRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Fresh Produce",
            });
        produceCategoryId = produceRes.body.data.id;

        const fruitsRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Organic Fruits",
                parentId: produceCategoryId,
            });
        fruitsCategoryId = fruitsRes.body.data.id;
    }, 45000);

    afterAll(async () => {
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    it("1. Should allow SUPER_ADMIN to create a multi-currency Food product (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Organic Honeycrisp Apples",
                description: "Crisp, sweet, and locally harvested USDA certified organic apples.",
                shortDescription: "Sweet organic apples",
                brand: "Nature Harvest",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "APL-HONEYCRISP-1KG",
                        title: "1kg Bag",
                        prices: [
                            { currency: "USD", amount: 499, compareAtAmount: 599, costAmount: 250 },
                            { currency: "INR", amount: 39900, compareAtAmount: 49900, costAmount: 20000 },
                            { currency: "EUR", amount: 450, compareAtAmount: 550, costAmount: 220 },
                        ],
                        weight: 1,
                        weightUnit: "kg",
                    },
                    {
                        sku: "APL-HONEYCRISP-3KG",
                        title: "3kg Box",
                        prices: [
                            { currency: "USD", amount: 1299, compareAtAmount: 1499, costAmount: 650 },
                            { currency: "INR", amount: 99900, compareAtAmount: 119900, costAmount: 55000 },
                        ],
                        weight: 3,
                        weightUnit: "kg",
                    },
                ],
                tags: ["organic", "fresh", "fruits", "apple", "honeycrisp"],
                nutritionInfo: {
                    calories: 52,
                    carbohydrates: 14,
                    fiber: 2,
                    servingSize: "100g",
                },
                seo: {
                    metaTitle: "Buy Organic Honeycrisp Apples | ShopSphere Fresh",
                    metaDescription: "Fresh organic honeycrisp apples delivered directly to your doorstep.",
                },
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Organic Honeycrisp Apples");
        expect(res.body.data.slug).toBe("organic-honeycrisp-apples");
        expect(res.body.data.status).toBe("DRAFT");
        expect(res.body.data.version).toBe(1);
        expect(res.body.data.variants.length).toBe(2);
        expect(res.body.data.variants[0].sku).toBe("APL-HONEYCRISP-1KG");
        expect(res.body.data.variants[0].prices.length).toBe(3);
        expect(res.body.data.createdBy).toBeDefined();
        expect(res.body.data.createdBy.email).toBe("superadmin@gmail.com");
        expect(res.body.data.createdBy.role).toBe("SUPER_ADMIN");

        appleProductId = res.body.data.id;
        appleProductSlug = res.body.data.slug;
    });

    it("2. Should auto-increment duplicate slug on another product (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Organic Honeycrisp Apples",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "APL-HONEYCRISP-5KG",
                        title: "5kg Crate",
                        prices: [{ currency: "USD", amount: 1999 }],
                    },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.slug).toBe("organic-honeycrisp-apples-1");
    });

    it("3. Should reject duplicate SKU within the same product payload (400 Bad Request)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Duplicate SKU Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    { sku: "SKU-DUP-INTRA", title: "Size A", prices: [{ currency: "USD", amount: 500 }] },
                    { sku: "sku-dup-intra", title: "Size B", prices: [{ currency: "USD", amount: 800 }] },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("4. Should reject duplicate SKU across different products (409 Conflict)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Conflicting SKU Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    { sku: "APL-HONEYCRISP-1KG", title: "Conflict Bag", prices: [{ currency: "USD", amount: 600 }] },
                ],
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("SKU_ALREADY_EXISTS");
    });

    it("5. Should reject duplicate currency inside the same variant (400 Bad Request)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Duplicate Currency Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-DUP-CURR",
                        title: "1kg",
                        prices: [
                            { currency: "USD", amount: 500 },
                            { currency: "USD", amount: 600 },
                        ],
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("6. Should reject variant missing base currency price (400 Bad Request)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Missing Base Currency Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-NO-BASE",
                        title: "1kg",
                        prices: [{ currency: "EUR", amount: 500 }],
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("7. Should reject product creation with non-existent categoryId (400 Bad Request)", async () => {
        const fakeCategoryId = "6a01d0b4fa2bce9833080bd9";
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Bad Category Product",
                categoryId: fakeCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-BAD-CAT",
                        title: "Default",
                        prices: [{ currency: "USD", amount: 500 }],
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_CATEGORY");
    });

    it("8. Should hide DRAFT product from customer / public query (404 Not Found)", async () => {
        const res = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
    });

    it("9. Should allow staff to retrieve DRAFT product with product.read permission (200 OK)", async () => {
        const res = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${supportToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(appleProductId);
        expect(res.body.data.status).toBe("DRAFT");
    });

    it("10. Should ensure costAmount is structurally absent in public product listing (200 OK)", async () => {
        // First publish a product so public can view it
        await request(app)
            .patch(`/api/v1/products/${appleProductId}/publish`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        const res = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        for (const variant of res.body.data.variants) {
            for (const price of variant.prices) {
                expect(price.costAmount).toBeUndefined();
            }
        }
    });

    it("11. Should include costAmount in staff product response (200 OK)", async () => {
        const res = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        const usdPrice = res.body.data.variants[0].prices.find((p: any) => p.currency === "USD");
        expect(usdPrice).toBeDefined();
        expect(usdPrice.costAmount).toBe(250);
    });

    it("12. Should reject publishing product with all variants inactive (400 Bad Request)", async () => {
        const draftRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Inactive Variants Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-INACTIVE-1",
                        title: "Inactive Item",
                        prices: [{ currency: "USD", amount: 500 }],
                        isActive: false,
                    },
                ],
            });

        const prodId = draftRes.body.data.id;

        const pubRes = await request(app)
            .patch(`/api/v1/products/${prodId}/publish`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(pubRes.status).toBe(400);
        expect(pubRes.body.error.code).toBe("NO_ACTIVE_VARIANTS");
    });

    it("13. Should reject publishing product when active variant base price is zero (400 Bad Request)", async () => {
        const draftRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Free Unpriced Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-FREE-0",
                        title: "Zero Price Item",
                        prices: [{ currency: "USD", amount: 0 }],
                    },
                ],
            });

        const prodId = draftRes.body.data.id;

        const pubRes = await request(app)
            .patch(`/api/v1/products/${prodId}/publish`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(pubRes.status).toBe(400);
        expect(pubRes.body.error.code).toBe("INVALID_PRICE");
    });

    it("14. Should successfully publish product via product.publish (200 OK)", async () => {
        // Re-check publishing on appleProductId (already published in step 10)
        const res = await request(app)
            .patch(`/api/v1/products/${appleProductId}/publish`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("PUBLISHED");
    });

    it("15. Should allow customer to retrieve PUBLISHED product by slug (200 OK)", async () => {
        const res = await request(app)
            .get(`/api/v1/products/slug/${appleProductSlug}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(appleProductId);
        expect(res.body.data.status).toBe("PUBLISHED");
        expect(res.body.data.variants[0].prices[0].costAmount).toBeUndefined();
    });

    it("16. Should match products in subcategory when filtering by parent category (Subtree Query) (200 OK)", async () => {
        // appleProductId is under fruitsCategoryId, which is a child of produceCategoryId
        const res = await request(app)
            .get(`/api/v1/products?categoryId=${produceCategoryId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        const match = res.body.data.find((p: any) => p.id === appleProductId);
        expect(match).toBeDefined();
    });

    it("17. Should filter products by multi-currency price range (200 OK)", async () => {
        // Matches $4.99 ($499)
        const hitRes = await request(app)
            .get("/api/v1/products?currency=USD&minPrice=400&maxPrice=600");

        expect(hitRes.status).toBe(200);
        expect(hitRes.body.data.some((p: any) => p.id === appleProductId)).toBe(true);

        // Does not match $50.00 - $100.00
        const missRes = await request(app)
            .get("/api/v1/products?currency=USD&minPrice=5000&maxPrice=10000");

        expect(missRes.status).toBe(200);
        expect(missRes.body.data.some((p: any) => p.id === appleProductId)).toBe(false);
    });

    it("18. Should perform full-text search on product title and tags (200 OK)", async () => {
        const res = await request(app)
            .get("/api/v1/products?search=honeycrisp");

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].id).toBe(appleProductId);
    });

    it("19. Should soft-archive product on DELETE /products/:id (200 OK)", async () => {
        const res = await request(app)
            .delete(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify state is ARCHIVED via staff query
        const check = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(check.status).toBe(200);
        expect(check.body.data.status).toBe("ARCHIVED");
    });

    it("20. Should return 404 for customer attempting to view ARCHIVED product (404 Not Found)", async () => {
        const res = await request(app)
            .get(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
    });

    it("21. Should reject CUSTOMER from creating, updating, or archiving products (403 Forbidden)", async () => {
        const postRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ title: "Hacker Item", categoryId: fruitsCategoryId, variants: [] });
        expect(postRes.status).toBe(403);

        const patchRes = await request(app)
            .patch(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ title: "Hacked Title" });
        expect(patchRes.status).toBe(403);

        const deleteRes = await request(app)
            .delete(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${customerToken}`);
        expect(deleteRes.status).toBe(403);
    });

    it("22. Should handle concurrent slug generation deterministically without collision (201 Created)", async () => {
        const [res1, res2] = await Promise.all([
            request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Fresh Broccoli Crowns",
                    categoryId: produceCategoryId,
                    baseCurrency: "USD",
                    variants: [{ sku: "BRC-001", title: "500g", prices: [{ currency: "USD", amount: 299 }] }],
                }),
            request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Fresh Broccoli Crowns",
                    categoryId: produceCategoryId,
                    baseCurrency: "USD",
                    variants: [{ sku: "BRC-002", title: "1kg", prices: [{ currency: "USD", amount: 499 }] }],
                }),
        ]);

        expect(res1.status).toBe(201);
        expect(res2.status).toBe(201);
        expect(res1.body.data.slug).not.toBe(res2.body.data.slug);
    });

    it("23. Should reject concurrent creation of products with duplicate SKU (409 Conflict)", async () => {
        const [res1, res2] = await Promise.all([
            request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Parallel Mangoes A",
                    categoryId: fruitsCategoryId,
                    baseCurrency: "USD",
                    variants: [{ sku: "MNG-CONCURRENT", title: "1kg", prices: [{ currency: "USD", amount: 999 }] }],
                }),
            request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Parallel Mangoes B",
                    categoryId: fruitsCategoryId,
                    baseCurrency: "USD",
                    variants: [{ sku: "MNG-CONCURRENT", title: "1kg", prices: [{ currency: "USD", amount: 999 }] }],
                }),
        ]);

        const statuses = [res1.status, res2.status];
        expect(statuses).toContain(201);
        expect(statuses).toContain(409);
    });

    it("24. Should reject variant when compareAtAmount is less than amount (400 Bad Request)", async () => {
        const res = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Invalid Compare Price Product",
                categoryId: fruitsCategoryId,
                baseCurrency: "USD",
                variants: [
                    {
                        sku: "SKU-INVALID-COMPARE",
                        title: "1kg",
                        prices: [{ currency: "USD", amount: 1000, compareAtAmount: 500 }],
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("25. Should reject update with stale expectedVersion with 409 RESOURCE_VERSION_CONFLICT (409 Conflict)", async () => {
        const res = await request(app)
            .patch(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Stale Version Attempt",
                expectedVersion: 999,
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("RESOURCE_VERSION_CONFLICT");
    });

    it("26. Should reject STAFF user lacking product.update permission (403 Forbidden)", async () => {
        const res = await request(app)
            .patch(`/api/v1/products/${appleProductId}`)
            .set("Authorization", `Bearer ${supportToken}`)
            .send({
                title: "Unauthorized Staff Edit",
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });
});
