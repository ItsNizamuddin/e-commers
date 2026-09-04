import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";

describe("Category Module Integration Tests", () => {
    let superAdminToken: string;
    let customerToken: string;
    let produceId: string;
    let fruitsId: string;
    let berriesId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // Log in Super Admin
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        superAdminToken = adminLogin.body.data.accessToken;

        // Register & Log in Customer
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer@example.com",
                password: "Password123!",
                firstName: "Test",
                lastName: "Customer",
            });

        const custLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer@example.com",
                password: "Password123!",
            });
        customerToken = custLogin.body.data.accessToken;
    }, 30000);

    afterAll(async () => {
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    it("1. Should allow SUPER_ADMIN to create a top-level Food category (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Fresh Organic Produce",
                description: "Farm-fresh organic fruits, leafy vegetables, and seasonal harvests",
                seo: {
                    metaTitle: "Buy Fresh Organic Produce Online | ShopSphere Grocery",
                    metaDescription: "Farm-fresh 100% organic fruits and vegetables delivered cold to your doorstep.",
                    metaRobots: "index, follow",
                    keywords: ["organic produce", "fresh fruits", "organic vegetables"],
                    internalSection: {
                        title: "Why Choose ShopSphere Organic Produce?",
                        value: "<p>Harvested daily from certified organic farms.</p>",
                    },
                    bottomSection: {
                        title: "Quality Guarantee",
                        value: "<p>100% Non-GMO & Pesticide Free.</p>",
                    },
                },
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Fresh Organic Produce");
        expect(res.body.data.slug).toBe("fresh-organic-produce");
        expect(res.body.data.parentId).toBeNull();
        expect(res.body.data.ancestors).toEqual([]);
        expect(res.body.data.seo.metaTitle).toBe("Buy Fresh Organic Produce Online | ShopSphere Grocery");
        expect(res.body.data.createdBy).toBeDefined();
        expect(res.body.data.createdBy.email).toBe("superadmin@gmail.com");
        expect(res.body.data.createdBy.role).toBe("SUPER_ADMIN");
        expect(res.body.data.updatedBy).toBeDefined();
        expect(res.body.data.updatedBy.email).toBe("superadmin@gmail.com");
        produceId = res.body.data.id;
    });

    it("2. Should allow creating a subcategory with parentId and set ancestors path (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Organic Fruits",
                parentId: produceId,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Organic Fruits");
        expect(res.body.data.parentId).toBe(produceId);
        expect(res.body.data.ancestors).toEqual([produceId]);
        fruitsId = res.body.data.id;
    });

    it("3. Should allow creating a 3rd-level subcategory with correct ancestor chain (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Organic Berries",
                parentId: fruitsId,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.parentId).toBe(fruitsId);
        expect(res.body.data.ancestors).toEqual([produceId, fruitsId]);
        berriesId = res.body.data.id;
    });

    it("4. Should auto-increment duplicate name slug (fresh-organic-produce-1)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Fresh Organic Produce",
            });

        expect(res.status).toBe(201);
        expect(res.body.data.slug).toBe("fresh-organic-produce-1");
    });

    it("5. Should reject explicit duplicate slug (409 Conflict)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Another Organic Category",
                slug: "fresh-organic-produce",
            });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("SLUG_ALREADY_EXISTS");
    });

    it("6. Should return nested hierarchical tree format (200 OK)", async () => {
        const res = await request(app)
            .get("/api/v1/categories?tree=true");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);

        const produceNode = res.body.data.find((c: any) => c.id === produceId);
        expect(produceNode).toBeDefined();
        expect(produceNode.children.length).toBeGreaterThan(0);

        const fruitsNode = produceNode.children.find((c: any) => c.id === fruitsId);
        expect(fruitsNode).toBeDefined();
        expect(fruitsNode.children.length).toBeGreaterThan(0);
        expect(fruitsNode.children[0].id).toBe(berriesId);
    });

    it("7. Should fetch category by slug (200 OK)", async () => {
        const res = await request(app)
            .get("/api/v1/categories/slug/fresh-organic-produce");

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(produceId);
    });

    it("8. Should reject category setting itself as parent (400 Bad Request)", async () => {
        const res = await request(app)
            .patch(`/api/v1/categories/${produceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                parentId: produceId,
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INVALID_PARENT");
    });

    it("9. Should reject circular parent relationship (400 Bad Request)", async () => {
        const res = await request(app)
            .patch(`/api/v1/categories/${produceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                parentId: berriesId,
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("CIRCULAR_DEPENDENCY");
    });

    it("10. Should reject deleting category with active subcategories (400 Bad Request)", async () => {
        const res = await request(app)
            .delete(`/api/v1/categories/${produceId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("HAS_SUBCATEGORIES");
    });

    it("11. Should successfully delete leaf category (200 OK)", async () => {
        const res = await request(app)
            .delete(`/api/v1/categories/${berriesId}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("12. Should reject CUSTOMER from creating category (403 Forbidden)", async () => {
        const res = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                name: "Forbidden Category",
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("13. Should atomically move category to root and recalculate ancestor chain within a transaction", async () => {
        const moveRes = await request(app)
            .patch(`/api/v1/categories/${fruitsId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                parentId: null,
            });

        expect(moveRes.status).toBe(200);
        expect(moveRes.body.data.parentId).toBeNull();
        expect(moveRes.body.data.ancestors).toEqual([]);
        expect(moveRes.body.data.updatedBy).toBeDefined();
        expect(moveRes.body.data.updatedBy.email).toBe("superadmin@gmail.com");

        const fetchRes = await request(app).get(`/api/v1/categories/${fruitsId}`);
        expect(fetchRes.body.data.parentId).toBeNull();
        expect(fetchRes.body.data.ancestors).toEqual([]);
    });
});
