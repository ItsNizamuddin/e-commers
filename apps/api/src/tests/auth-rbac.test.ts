import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";

describe("Enterprise Auth & RBAC Integration Tests", () => {
    beforeAll(async () => {
        await connectDatabase();
        // Clean test collections before test suite run
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await seedDefaultSuperAdmin();
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    it("1. Should register CUSTOMER account successfully (201 Created)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
                firstName: "Jane",
                lastName: "Buyer",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe("buyer@example.com");
        expect(res.body.data.role).toBe("CUSTOMER");
    });

    it("2. Should reject registration containing unauthorized role field (400 Bad Request)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "hacker@example.com",
                password: "Password123!",
                firstName: "Evil",
                lastName: "Hacker",
                role: "ADMIN",
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("3. Should reject duplicate email registration (409 Conflict)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
                firstName: "Jane",
                lastName: "Buyer",
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("4. Should log in CUSTOMER account via storefront login endpoint (200 OK)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("accessToken");
        expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("5. Should reject STAFF user logging in via Customer storefront endpoint (403 Forbidden)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("6. Should reject CUSTOMER user logging in via Admin portal endpoint (403 Forbidden)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("7. Should log in STAFF user via Admin portal login endpoint (200 OK)", async () => {
        const res = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe("SUPER_ADMIN");
        expect(res.body.data).toHaveProperty("accessToken");
    });

    it("8. Should reject CUSTOMER token calling Admin API (403 Forbidden)", async () => {
        const customerLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
            });

        const customerToken = customerLogin.body.data.accessToken;

        const res = await request(app)
            .get("/api/v1/admin/users")
            .set("Authorization", `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("9. Should allow SUPER_ADMIN to create a new STAFF user (201 Created)", async () => {
        const superLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        const superToken = superLogin.body.data.accessToken;

        const res = await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${superToken}`)
            .send({
                email: "sales.mgr@example.com",
                password: "SalesPass123!",
                firstName: "Sarah",
                lastName: "Sales",
                role: "SALES",
            });

        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe("SALES");
    });

    it("10. Should reject SALES staff user creating another staff account (403 Forbidden)", async () => {
        const salesLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "sales.mgr@example.com",
                password: "SalesPass123!",
            });

        const salesToken = salesLogin.body.data.accessToken;

        const res = await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${salesToken}`)
            .send({
                email: "pub@example.com",
                password: "PubPass123!",
                firstName: "Peter",
                lastName: "Publisher",
                role: "PUBLISHER",
            });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("11. Should allow SUPER_ADMIN to update staff user role (200 OK)", async () => {
        const superLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        const superToken = superLogin.body.data.accessToken;

        const targetSalesUser = await UserModel.findOne({ email: "sales.mgr@example.com" });

        const res = await request(app)
            .patch(`/api/v1/admin/users/${targetSalesUser!._id.toString()}/role`)
            .set("Authorization", `Bearer ${superToken}`)
            .send({ role: "PUBLISHER" });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe("PUBLISHER");
    });

    it("12. Should prevent ADMIN from deactivating a SUPER_ADMIN user (403 Forbidden)", async () => {
        const superLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        const superToken = superLogin.body.data.accessToken;

        // Create an ADMIN user
        await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${superToken}`)
            .send({
                email: "admin.user@example.com",
                password: "AdminPassword123!",
                firstName: "Adam",
                lastName: "Admin",
                role: "ADMIN",
            });

        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "admin.user@example.com",
                password: "AdminPassword123!",
            });

        const adminToken = adminLogin.body.data.accessToken;
        const mainSuperUser = await UserModel.findOne({ email: "superadmin@gmail.com" });

        // ADMIN attempts to deactivate SUPER_ADMIN
        const res = await request(app)
            .patch(`/api/v1/admin/users/${mainSuperUser!._id.toString()}/status`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ isActive: false });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("13. Should revoke refresh session and clear cookies on logout", async () => {
        const customerLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "buyer@example.com",
                password: "Password123!",
            });

        const cookies = customerLogin.headers["set-cookie"];

        const logoutRes = await request(app)
            .post("/api/v1/auth/logout")
            .set("Cookie", (cookies as unknown as string[]) || []);

        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.data.message).toBe("Customer logged out successfully");

        // Attempting to refresh using revoked session cookie should be rejected
        const refreshRes = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", (cookies as unknown as string[]) || []);

        expect(refreshRes.status).toBe(401);
        expect(refreshRes.body.error.code).toBe("SESSION_REVOKED");
    });
});
