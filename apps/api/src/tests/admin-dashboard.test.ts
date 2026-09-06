import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import { InventoryModel } from "../modules/inventory/inventory.model.js";
import { OrderModel } from "../modules/orders/models/order.model.js";
import { PaymentModel } from "../modules/payments/models/payment.model.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Admin Analytics & Dashboard Integration Tests", () => {
    let adminToken: string;
    let customerToken: string;
    let customerAId: string;
    let customerBId: string;

    let testProductId: string;
    let variantAId: string;
    let variantBId: string;

    const defaultWarehouseId = DEFAULT_WAREHOUSE_ID;

    beforeAll(async () => {
        await connectDatabase();
        await OrderModel.deleteMany({});
        await PaymentModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
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
                email: "customer.dash.a@shopsphere.test",
                password: "Password123!",
                firstName: "Alice",
                lastName: "AdminTest",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "customer.dash.a@shopsphere.test",
                password: "Password123!",
            });
        customerToken = loginA.body.data.accessToken;

        // 3. Register Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "customer.dash.b@shopsphere.test",
                password: "Password123!",
                firstName: "Bob",
                lastName: "AdminTest",
            });
        customerBId = regB.body.data.id;

        // 4. Create Category & Product
        const category = await CategoryModel.create({
            name: "Dashboard Analytics Category",
            slug: "dashboard-analytics-category",
        });

        variantAId = new Types.ObjectId().toString();
        variantBId = new Types.ObjectId().toString();

        const publishedProduct = await ProductModel.create({
            title: "Analytics SoundPro Speaker",
            slug: "analytics-soundpro-speaker",
            brand: "SoundWave",
            categoryId: category._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            version: 1,
            variants: [
                {
                    id: variantAId,
                    sku: "ANL-VAR-A",
                    title: "Speaker Midnight Black",
                    prices: [{ currency: "USD", amount: 100.0 }],
                    isActive: true,
                },
                {
                    id: variantBId,
                    sku: "ANL-VAR-B",
                    title: "Speaker Glacier White",
                    prices: [{ currency: "USD", amount: 150.0 }],
                    isActive: true,
                },
            ],
        });
        testProductId = publishedProduct._id.toString();

        // 5. Seed Inventory: Variant A (healthy stock 50), Variant B (low stock 2 <= threshold 5)
        await InventoryModel.create({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(variantAId),
            warehouseId: new Types.ObjectId(defaultWarehouseId),
            onHand: 50,
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
            onHand: 2, // Low stock alert!
            reserved: 0,
            backordered: 0,
            safetyStock: 0,
            reorderThreshold: 5,
            allowBackorder: false,
            version: 1,
        });

        // 6. Seed Orders for Customer A and B
        // Order 1: Customer A, CONFIRMED, CAPTURED, UNFULFILLED ($200 + $10 tax + $15 ship - $20 discount = $205 grand total)
        await OrderModel.create({
            orderNumber: "ORD-TEST-001",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerAId),
            customerEmailSnapshot: "customer.dash.a@shopsphere.test",
            items: [
                {
                    productId: testProductId,
                    variantId: variantAId,
                    sku: "ANL-VAR-A",
                    productTitle: "Analytics SoundPro Speaker",
                    variantTitle: "Speaker Midnight Black",
                    quantity: 2,
                    currency: "USD",
                    unitPriceMinor: 10000,
                    lineTotalMinor: 20000,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Alice",
                lastName: "AdminTest",
                street: "123 Main St",
                city: "Metropolis",
                state: "NY",
                postalCode: "10001",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Alice",
                lastName: "AdminTest",
                street: "123 Main St",
                city: "Metropolis",
                state: "NY",
                postalCode: "10001",
                country: "US",
            },
            pricing: {
                subtotalMinor: 20000,
                shippingMinor: 1500,
                taxMinor: 1000,
                discountMinor: 2000,
                grandTotalMinor: 20500,
                currency: "USD",
            },
            orderStatus: "CONFIRMED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "UNFULFILLED",
            placedAt: new Date(),
        });

        // Order 2: Customer B, COMPLETED, CAPTURED, DELIVERED ($150 + $5 tax + $10 ship = $165 grand total)
        await OrderModel.create({
            orderNumber: "ORD-TEST-002",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerBId),
            customerEmailSnapshot: "customer.dash.b@shopsphere.test",
            items: [
                {
                    productId: testProductId,
                    variantId: variantBId,
                    sku: "ANL-VAR-B",
                    productTitle: "Analytics SoundPro Speaker",
                    variantTitle: "Speaker Glacier White",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 15000,
                    lineTotalMinor: 15000,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Bob",
                lastName: "AdminTest",
                street: "456 Market St",
                city: "Gotham",
                state: "NJ",
                postalCode: "07001",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Bob",
                lastName: "AdminTest",
                street: "456 Market St",
                city: "Gotham",
                state: "NJ",
                postalCode: "07001",
                country: "US",
            },
            pricing: {
                subtotalMinor: 15000,
                shippingMinor: 1000,
                taxMinor: 500,
                discountMinor: 0,
                grandTotalMinor: 16500,
                currency: "USD",
            },
            orderStatus: "COMPLETED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "DELIVERED",
            placedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        });

        // Order 3: Customer A, CANCELLED ($100 grand total)
        await OrderModel.create({
            orderNumber: "ORD-TEST-003-CAN",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerAId),
            customerEmailSnapshot: "customer.dash.a@shopsphere.test",
            items: [
                {
                    productId: testProductId,
                    variantId: variantAId,
                    sku: "ANL-VAR-A",
                    productTitle: "Analytics SoundPro Speaker",
                    variantTitle: "Speaker Midnight Black",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 10000,
                    lineTotalMinor: 10000,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Alice",
                lastName: "AdminTest",
                street: "123 Main St",
                city: "Metropolis",
                state: "NY",
                postalCode: "10001",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Alice",
                lastName: "AdminTest",
                street: "123 Main St",
                city: "Metropolis",
                state: "NY",
                postalCode: "10001",
                country: "US",
            },
            pricing: {
                subtotalMinor: 10000,
                shippingMinor: 0,
                taxMinor: 0,
                discountMinor: 0,
                grandTotalMinor: 10000,
                currency: "USD",
            },
            orderStatus: "CANCELLED",
            paymentStatus: "REFUNDED",
            fulfillmentStatus: "UNFULFILLED",
            placedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        });

        // Seed 1 Refund record in PaymentModel ($50 refund)
        await PaymentModel.create({
            checkoutId: new Types.ObjectId(),
            paymentIntentId: `pi_refund_${Date.now()}`,
            provider: "MOCK",
            amountMinor: 5000,
            currency: "USD",
            status: "REFUNDED",
            refundedAt: new Date(),
        });
    }, 120000);

    afterAll(async () => {
        await OrderModel.deleteMany({});
        await PaymentModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    /* -------------------------------------------------------------------------- */
    /* 1. RBAC Permissions Guard                                                  */
    /* -------------------------------------------------------------------------- */
    it("Scenario 1: Rejects unauthenticated and non-admin requests to dashboard", async () => {
        // Unauthenticated
        const unauthRes = await request(app).get("/api/v1/admin/dashboard");
        expect(unauthRes.status).toBe(401);

        // Customer role (Forbidden)
        const custRes = await request(app)
            .get("/api/v1/admin/dashboard")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(custRes.status).toBe(403);
        expect(custRes.body.error.code).toBe("FORBIDDEN");
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Executive Dashboard KPIs & Metrics                                      */
    /* -------------------------------------------------------------------------- */
    it("Scenario 2: Returns accurate executive dashboard metrics from Order source of truth", async () => {
        const res = await request(app)
            .get("/api/v1/admin/dashboard?currency=USD")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const data = res.body.data;

        // 2.1 Financials check:
        // Order 1: subtotal 20000, ship 1500, tax 1000 = 22500
        // Order 2: subtotal 15000, ship 1000, tax 500 = 16500
        // Gross Revenue = 22500 + 16500 = 39000 ($390.00)
        // Discount = 2000 ($20.00)
        // Refund = 5000 ($50.00)
        // Net Revenue = 39000 - 2000 - 5000 = 32000 ($320.00)
        expect(data.financials.currency).toBe("USD");
        expect(data.financials.grossRevenueMinor).toBe(39000);
        expect(data.financials.grossRevenue).toBe(390.0);
        expect(data.financials.discountTotalMinor).toBe(2000);
        expect(data.financials.discountTotal).toBe(20.0);
        expect(data.financials.taxTotalMinor).toBe(1500);
        expect(data.financials.shippingTotalMinor).toBe(2500);
        expect(data.financials.refundTotalMinor).toBe(5000);
        expect(data.financials.refundTotal).toBe(50.0);
        expect(data.financials.netRevenueMinor).toBe(32000);
        expect(data.financials.netRevenue).toBe(320.0);

        // 2.2 Order status breakdown check (3 orders total)
        expect(data.orders.totalOrders).toBe(3);
        expect(data.orders.breakdown.byOrderStatus.CONFIRMED).toBe(1);
        expect(data.orders.breakdown.byOrderStatus.COMPLETED).toBe(1);
        expect(data.orders.breakdown.byOrderStatus.CANCELLED).toBe(1);

        expect(data.orders.breakdown.byPaymentStatus.CAPTURED).toBe(2);
        expect(data.orders.breakdown.byPaymentStatus.REFUNDED).toBe(1);

        expect(data.orders.breakdown.byFulfillmentStatus.UNFULFILLED).toBe(2);
        expect(data.orders.breakdown.byFulfillmentStatus.DELIVERED).toBe(1);

        // 2.3 Customers check
        expect(data.customers.totalCustomers).toBe(2); // Alice and Bob
        expect(data.customers.activeCustomersCount).toBe(2);
        expect(data.customers.newCustomersLast30Days).toBe(2);

        // 2.4 Inventory check
        expect(data.inventory.lowStockCount).toBe(1); // Variant B onHand: 2 <= 5
        expect(data.inventory.lowStockAlerts.length).toBe(1);
        expect(data.inventory.lowStockAlerts[0].variantId).toBe(variantBId);

        // 2.5 Top Selling Products check
        expect(data.topSellingProducts.length).toBeGreaterThanOrEqual(1);
        const top = data.topSellingProducts[0];
        expect(top.sku).toBe("ANL-VAR-A");
        expect(top.unitsSold).toBe(2);
        expect(top.totalRevenueMinor).toBe(20000);

        // 2.6 Recent orders check
        expect(data.recentOrders.length).toBe(3);
        expect(data.recentOrders[0].currency).toBe("USD");
        expect(data.recentOrders[0].orderNumber).toBeDefined();
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Sales Analytics Time-Series Query                                       */
    /* -------------------------------------------------------------------------- */
    it("Scenario 3: Returns grouped time-series sales analytics with summary KPIs", async () => {
        const res = await request(app)
            .get("/api/v1/admin/analytics/sales?interval=day&currency=USD")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const { summary, series } = res.body.data;
        expect(summary.totalOrders).toBe(2); // Only non-cancelled CONFIRMED/COMPLETED
        expect(summary.totalUnitsSold).toBe(3); // 2 of Var A + 1 of Var B
        expect(summary.grossRevenueMinor).toBe(39000);
        expect(summary.netRevenueMinor).toBe(37000); // without order-level refund deduction

        expect(Array.isArray(series)).toBe(true);
        expect(series.length).toBeGreaterThanOrEqual(1);

        const point = series[0];
        expect(point.date).toBeDefined();
        expect(point.orderCount).toBeGreaterThanOrEqual(1);
        expect(point.grossRevenueMinor).toBeGreaterThan(0);
        expect(point.unitsSold).toBeGreaterThan(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Customer Accounts List & Lifetime Spend Aggregation                     */
    /* -------------------------------------------------------------------------- */
    it("Scenario 4: Returns paginated customer accounts with computed LTV and order counts", async () => {
        const res = await request(app)
            .get("/api/v1/admin/customers?page=1&limit=10&sortBy=spent")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(2);

        // Alice has Order 1 ($205.00) and Order 3 ($100 CANCELLED -> ignored in spend)
        // Bob has Order 2 ($165.00)
        // Sorted by spent descending: Alice first ($205.00), Bob second ($165.00)
        const alice = res.body.data.find((c: any) => c.email === "customer.dash.a@shopsphere.test");
        const bob = res.body.data.find((c: any) => c.email === "customer.dash.b@shopsphere.test");

        expect(alice).toBeDefined();
        expect(alice.orderCount).toBe(1); // active orders
        expect(alice.lifetimeSpendMinor).toBe(20500);
        expect(alice.lifetimeSpend).toBe(205.0);
        expect(alice.lastOrderDate).toBeDefined();

        expect(bob).toBeDefined();
        expect(bob.orderCount).toBe(1);
        expect(bob.lifetimeSpendMinor).toBe(16500);
        expect(bob.lifetimeSpend).toBe(165.0);

        // Test search filter
        const searchRes = await request(app)
            .get("/api/v1/admin/customers?search=Alice")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.length).toBe(1);
        expect(searchRes.body.data[0].firstName).toBe("Alice");
    });
});
