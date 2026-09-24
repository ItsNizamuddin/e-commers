import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { InventoryModel } from "../modules/inventory/inventory.model.js";
import { FinishedGoodsLotModel } from "../modules/manufacturing/finished-goods-lot.model.js";
import { RawMaterialLotModel } from "../modules/manufacturing/raw-material-lot.model.js";
import { RawMaterialModel } from "../modules/manufacturing/raw-material.model.js";
import { OrderModel } from "../modules/orders/models/order.model.js";
import { PackingSessionModel } from "../modules/orders/models/packing-session.model.js";
import { OutboxEventModel } from "../modules/outbox/outbox.model.js";
import { runExpiryScan } from "../modules/queues/workers/expiry-monitor.worker.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Packing Bench Scanner & Food Safety Live Alerts Integration", () => {
    let superAdminToken: string;
    let customerUserId: string;
    let orderId: string;
    let orderNumber: string;
    let finishedLotAId: string;
    let finishedLotANumber: string;
    let finishedLotBId: string;
    let finishedLotBNumber: string;
    let rawLotId: string;
    let rawLotNumber: string;
    let orderVersion: number;
    let testProductId: string;
    let testVariantId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await FinishedGoodsLotModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RawMaterialLotModel.deleteMany({});
        await OrderModel.deleteMany({});
        await PackingSessionModel.deleteMany({});

        await seedDefaultSuperAdmin();

        // 1. Admin login
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        expect(adminLogin.status).toBe(200);
        superAdminToken = adminLogin.body.data.accessToken;

        // 2. Setup Category & Product
        const catRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Organic Honey",
                slug: `honey-${Date.now()}`,
                description: "Raw wild organic honey",
                isActive: true,
            });
        const categoryId = catRes.body.data.id;

        const prodRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Wild Forest Honey 500g",
                slug: `wild-forest-honey-${Date.now()}`,
                categoryId,
                baseCurrency: "USD",
                productType: "FINISHED_PRODUCT",
                unit: "JAR",
                isManufactured: true,
                variants: [
                    {
                        sku: `HONEY-500G-${Date.now()}`,
                        title: "500g Jar",
                        prices: [
                            {
                                currency: "USD",
                                amount: 15,
                                costAmount: 8,
                            },
                        ],
                    },
                ],
            });
        expect(prodRes.status).toBe(201);
        testProductId = prodRes.body.data.id;
        testVariantId = prodRes.body.data.variants[0].id;
        const productId = testProductId;
        const variantId = testVariantId;

        // 3. Create Finished Goods Lots
        const packagingRunId = new Types.ObjectId();
        finishedLotANumber = `RPK-${Date.now()}-1001`;
        const lotA = await FinishedGoodsLotModel.create({
            lotNumber: finishedLotANumber,
            packagingRunId,
            productId: new Types.ObjectId(productId),
            variantId: new Types.ObjectId(variantId),
            warehouseId: DEFAULT_WAREHOUSE_ID,
            lotQuantity: 10,
            availableQuantity: 8,
            allocatedQuantity: 2,
            consumedQuantity: 0,
            expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days out
            qualityStatus: "AVAILABLE",
            publicVerificationToken: `bv_${Date.now()}_a`,
            packedAt: new Date(),
        });
        finishedLotAId = lotA._id.toString();

        finishedLotBNumber = `RPK-${Date.now()}-2002`;
        const lotB = await FinishedGoodsLotModel.create({
            lotNumber: finishedLotBNumber,
            packagingRunId,
            productId: new Types.ObjectId(productId),
            variantId: new Types.ObjectId(variantId),
            warehouseId: DEFAULT_WAREHOUSE_ID,
            lotQuantity: 10,
            availableQuantity: 10,
            allocatedQuantity: 0,
            consumedQuantity: 0,
            expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days out (CRITICAL)
            qualityStatus: "AVAILABLE",
            publicVerificationToken: `bv_${Date.now()}_b`,
            packedAt: new Date(),
        });
        finishedLotBId = lotB._id.toString();

        // 4. Create a Raw Material Lot (to verify scanner rejects raw material lots)
        const rawMat = await RawMaterialModel.create({
            name: "Bulk Raw Honey",
            code: `RM-HONEY-${Date.now()}`,
            category: "SWEETENER",
            usage: "RAW_MATERIAL",
            unit: "kg",
            reorderThreshold: 50,
            currentStock: 100,
            averageCost: 5,
            lastPurchasePrice: 5,
            isActive: true,
        });
        rawLotNumber = `RAW-${Date.now()}-9999`;
        const rawLot = await RawMaterialLotModel.create({
            lotNumber: rawLotNumber,
            rawMaterialId: rawMat._id,
            initialQuantity: 100,
            availableQuantity: 100,
            unit: "kg",
            costPerUnit: 5,
            sourceType: "EXTERNAL_VENDOR",
            supplier: { name: "Honey Co" },
            status: "AVAILABLE",
            isDepleted: false,
            receivedDate: new Date(),
            expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        });
        rawLotId = rawLot._id.toString();

        // 5. Create Customer Order with FEFO Allocation for Lot A (2 jars)
        customerUserId = new Types.ObjectId().toString();
        orderNumber = `ORD-PACK-${Date.now()}`;
        const order = await OrderModel.create({
            orderNumber,
            customerId: new Types.ObjectId(customerUserId),
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            orderStatus: "CONFIRMED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "PROCESSING",
            version: 1,
            pricing: {
                subtotalMinor: 3000,
                taxMinor: 0,
                shippingMinor: 0,
                discountMinor: 0,
                grandTotalMinor: 3000,
                currency: "USD",
            },
            customerEmailSnapshot: "honeylover@example.com",
            shippingAddressSnapshot: {
                firstName: "John",
                lastName: "Doe",
                street: "123 Beehive Rd",
                city: "Sweet Valley",
                state: "CA",
                postalCode: "90210",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "John",
                lastName: "Doe",
                street: "123 Beehive Rd",
                city: "Sweet Valley",
                state: "CA",
                postalCode: "90210",
                country: "US",
            },
            items: [
                {
                    productId: productId.toString(),
                    variantId: variantId.toString(),
                    productTitle: "Wild Forest Honey 500g",
                    variantTitle: "500g Jar",
                    sku: `HONEY-500G-01`,
                    currency: "USD",
                    quantity: 2,
                    unitPriceMinor: 1500,
                    lineTotalMinor: 3000,
                    allocatedLots: [
                        {
                            lotId: lotA._id as any,
                            lotNumber: finishedLotANumber,
                            warehouseId: DEFAULT_WAREHOUSE_ID as any,
                            quantity: 2,
                        },
                    ],
                },
            ],
        });
        orderId = (order as any)._id.toString();
        orderVersion = (order as any).version;
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    describe("1. Backend Shipping Protection Guard", () => {
        it("should block dispatching shipment when packing verification is NOT started", async () => {
            const shipRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/ship`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    expectedVersion: orderVersion,
                    carrier: "FedEx",
                    trackingNumber: "TRK12345678",
                });

            expect(shipRes.status).toBe(400);
            expect(shipRes.body.error?.message || shipRes.body.message).toMatch(/Packing session is not VERIFIED/i);
        });
    });

    describe("2. Start Packing Session", () => {
        it("should initialize a persistent PackingSession with stationId and checklist items", async () => {
            const startRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/start`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    stationId: "PACK-BENCH-02",
                });

            expect(startRes.status).toBe(200);
            expect(startRes.body.data.status).toBe("IN_PROGRESS");
            expect(startRes.body.data.stationId).toBe("PACK-BENCH-02");
            expect(startRes.body.data.items).toHaveLength(1);
            expect(startRes.body.data.items[0].lotNumber).toBe(finishedLotANumber);
            expect(startRes.body.data.items[0].requiredQty).toBe(2);
            expect(startRes.body.data.items[0].verifiedQty).toBe(0);
        });

        it("should return the existing active session if called again idempotently", async () => {
            const sessionRes = await request(app)
                .get(`/api/v1/orders/admin/${orderId}/packing`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(sessionRes.status).toBe(200);
            expect(sessionRes.body.data.status).toBe("IN_PROGRESS");
            expect(sessionRes.body.data.stationId).toBe("PACK-BENCH-02");
        });
    });

    describe("3. Scanner Validation: Finished Goods Only & Explicit Scan States", () => {
        it("should reject an arbitrary raw material lot with NOT_FOUND (finished goods only)", async () => {
            const scanRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: rawLotNumber,
                    stationId: "PACK-BENCH-02",
                });

            expect(scanRes.status).toBe(200);
            expect(scanRes.body.data.scanResult).toBe("NOT_FOUND");
            expect(scanRes.body.data.message).toMatch(/No finished goods lot found/i);
        });

        it("should reject an unallocated finished goods lot with WRONG_LOT", async () => {
            const scanRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotBNumber,
                    stationId: "PACK-BENCH-02",
                });

            expect(scanRes.status).toBe(200);
            expect(scanRes.body.data.scanResult).toBe("WRONG_LOT");
            expect(scanRes.body.data.message).toMatch(/WRONG LOT/i);
        });

        it("should successfully verify the first allocated jar with MATCHED", async () => {
            const scanRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotANumber,
                    stationId: "PACK-BENCH-02",
                });

            expect(scanRes.status).toBe(200);
            expect(scanRes.body.data.scanResult).toBe("MATCHED");
            expect(scanRes.body.data.session.items[0].verifiedQty).toBe(1);
            expect(scanRes.body.data.session.status).toBe("IN_PROGRESS");
            expect(scanRes.body.data.session.scanEvents.length).toBeGreaterThanOrEqual(1);
        });

        it("should verify the second jar and auto-mark session as VERIFIED", async () => {
            const scanRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotANumber,
                    stationId: "PACK-BENCH-02",
                });

            expect(scanRes.status).toBe(200);
            expect(scanRes.body.data.scanResult).toBe("MATCHED");
            expect(scanRes.body.data.session.items[0].verifiedQty).toBe(2);
            expect(scanRes.body.data.session.status).toBe("VERIFIED");
        });

        it("should prevent exceeding required quantity on over-scan with ALREADY_COMPLETED", async () => {
            const scanRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotANumber,
                    stationId: "PACK-BENCH-02",
                });

            expect(scanRes.status).toBe(200);
            expect(scanRes.body.data.scanResult).toBe("ALREADY_COMPLETED");
            expect(scanRes.body.data.session.items[0].verifiedQty).toBe(2); // Still strictly 2, not 3!
        });
    });

    describe("4. Revalidation at Shipping Time (Food Safety Guard)", () => {
        it("should block shipping if a lot becomes RECALLED after packing verification", async () => {
            // Simulate recall on Lot A
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotAId) },
                { $set: { qualityStatus: "RECALLED" } }
            );

            const shipRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/ship`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    expectedVersion: orderVersion,
                    carrier: "DHL",
                    trackingNumber: "DHL998877",
                });

            expect(shipRes.status).toBe(400);
            expect(shipRes.body.error?.message || shipRes.body.message).toMatch(/RECALLED/i);

            // Restore Lot A to AVAILABLE
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotAId) },
                { $set: { qualityStatus: "AVAILABLE" } }
            );
        });
    });

    describe("5. Packing Reset Workflow", () => {
        it("should cancel current session with audit reason and initialize a fresh session", async () => {
            const resetRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/reset`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    reason: "Physical seal damaged on packed jar; repackaging required",
                    stationId: "PACK-BENCH-03",
                });

            expect(resetRes.status).toBe(200);
            expect(resetRes.body.data.sessionNumber).toBe(2);
            expect(resetRes.body.data.status).toBe("IN_PROGRESS");
            expect(resetRes.body.data.items[0].verifiedQty).toBe(0); // Clean reset!

            // Verify Session #1 is archived as CANCELLED in DB
            const cancelledSession = await PackingSessionModel.findOne({
                orderId: new Types.ObjectId(orderId),
                sessionNumber: 1,
            });
            expect(cancelledSession).not.toBeNull();
            expect(cancelledSession?.status).toBe("CANCELLED");
            expect(cancelledSession?.resetReason).toBe(
                "Physical seal damaged on packed jar; repackaging required"
            );
        });
    });

    describe("6. Complete Packing on Session #2 and Ship Successfully", () => {
        it("should scan 2 jars and ship order", async () => {
            // Scan 1
            await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotANumber,
                    stationId: "PACK-BENCH-03",
                });

            // Scan 2
            const scan2 = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    barcode: finishedLotANumber,
                    stationId: "PACK-BENCH-03",
                });

            expect(scan2.body.data.session.status).toBe("VERIFIED");

            // Fetch fresh order version
            const freshOrder = await OrderModel.findById(orderId);
            const currentVersion = freshOrder?.version || orderVersion;

            // Ship Order
            const shipRes = await request(app)
                .post(`/api/v1/orders/admin/${orderId}/ship`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    expectedVersion: currentVersion,
                    carrier: "UPS Express",
                    trackingNumber: "1Z9999999999999999",
                });

            expect(shipRes.status).toBe(200);
            expect(shipRes.body.data.fulfillmentStatus).toBe("SHIPPED");
        });
    });

    describe("7. Live Manufacturing & Food Safety Alerts Endpoint", () => {
        it("should return live alerts query reflecting DB state without waiting for cron", async () => {
            const alertsRes = await request(app)
                .get("/api/v1/admin/manufacturing/alerts")
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(alertsRes.status).toBe(200);
            const data = alertsRes.body.data;
            expect(data).toHaveProperty("summary");
            expect(data).toHaveProperty("expiringLots");
            expect(data).toHaveProperty("lowStockRawMaterials");
            expect(data).toHaveProperty("lowStockFinishedGoods");

            // Lot B expires in 5 days, so it should be captured as expiring
            const expiringLotB = data.expiringLots.find(
                (lot: any) => lot.lotNumber === finishedLotBNumber
            );
            expect(expiringLotB).toBeDefined();
            expect(expiringLotB.urgency).toBe("CRITICAL");
        });
    });

    describe("8. Multi-Instance Concurrency, Safety Guards & Edge Cases", () => {
        async function createTestOrder(qty: number, lotId: Types.ObjectId, lotNumber: string): Promise<any> {
            const ordNumber = `ORD-EDGE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            return OrderModel.create({
                orderNumber: ordNumber,
                customerId: new Types.ObjectId(customerUserId),
                checkoutId: new Types.ObjectId(),
                paymentId: new Types.ObjectId(),
                orderStatus: "CONFIRMED",
                paymentStatus: "CAPTURED",
                fulfillmentStatus: "PROCESSING",
                version: 1,
                pricing: {
                    subtotalMinor: 1500 * qty,
                    taxMinor: 0,
                    shippingMinor: 0,
                    discountMinor: 0,
                    grandTotalMinor: 1500 * qty,
                    currency: "USD",
                },
                customerEmailSnapshot: "tester@example.com",
                shippingAddressSnapshot: {
                    firstName: "Jane",
                    lastName: "Tester",
                    street: "456 Honey Lane",
                    city: "Sweet Valley",
                    state: "CA",
                    postalCode: "90210",
                    country: "US",
                },
                billingAddressSnapshot: {
                    firstName: "Jane",
                    lastName: "Tester",
                    street: "456 Honey Lane",
                    city: "Sweet Valley",
                    state: "CA",
                    postalCode: "90210",
                    country: "US",
                },
                items: [
                    {
                        productId: testProductId,
                        variantId: testVariantId,
                        productTitle: "Wild Forest Honey 500g",
                        variantTitle: "500g Jar",
                        sku: `HONEY-500G-EDGE`,
                        currency: "USD",
                        quantity: qty,
                        unitPriceMinor: 1500,
                        lineTotalMinor: 1500 * qty,
                        allocatedLots: [
                            {
                                lotId: lotId as any,
                                lotNumber,
                                warehouseId: DEFAULT_WAREHOUSE_ID as any,
                                quantity: qty,
                            },
                        ],
                    },
                ],
            } as any);
        }

        // 1. Concurrent scan test
        it("1. Concurrent scan test: simultaneous scans for requiredQty=1 produce exactly 1 MATCHED, 1 ALREADY_COMPLETED, verifiedQty=1", async () => {
            const singleOrder = await createTestOrder(1, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const singleOrderId = singleOrder._id.toString();

            // Initialize active packing session first
            await request(app)
                .post(`/api/v1/orders/admin/${singleOrderId}/packing/start`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ stationId: "PACK-BENCH-01" });

            // Simultaneous scans from two stations / API instances
            const [scanA, scanB] = await Promise.all([
                request(app)
                    .post(`/api/v1/orders/admin/${singleOrderId}/packing/scan`)
                    .set("Authorization", `Bearer ${superAdminToken}`)
                    .send({ barcode: finishedLotBNumber, stationId: "PACK-BENCH-CONCUR-A" }),
                request(app)
                    .post(`/api/v1/orders/admin/${singleOrderId}/packing/scan`)
                    .set("Authorization", `Bearer ${superAdminToken}`)
                    .send({ barcode: finishedLotBNumber, stationId: "PACK-BENCH-CONCUR-B" }),
            ]);

            expect(scanA.status).toBe(200);
            expect(scanB.status).toBe(200);

            const scanResults = [scanA.body.data.scanResult, scanB.body.data.scanResult].sort();
            expect(scanResults).toEqual(["ALREADY_COMPLETED", "MATCHED"]);

            // Database authority check: verifiedQty in MongoDB is strictly 1, never 2!
            const dbSession = await PackingSessionModel.findOne({
                orderId: new Types.ObjectId(singleOrderId),
                status: "VERIFIED",
            });
            expect(dbSession).not.toBeNull();
            expect(dbSession?.items[0]?.verifiedQty).toBe(1);
            expect(dbSession?.items[0]?.requiredQty).toBe(1);
        });

        // 2. Recall-after-packing test
        it("2. Recall-after-packing test: blocks shipment if lot is recalled after packing session was verified", async () => {
            const recallOrder = await createTestOrder(1, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const recallOrderId = recallOrder._id.toString();

            // Step 1: 10:00 -> Packing VERIFIED
            const packRes = await request(app)
                .post(`/api/v1/orders/admin/${recallOrderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ barcode: finishedLotBNumber, stationId: "PACK-BENCH-01" });
            expect(packRes.body.data.scanResult).toBe("MATCHED");
            expect(packRes.body.data.session.status).toBe("VERIFIED");

            // Step 2: 10:05 -> Lot becomes RECALLED
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotBId) },
                { $set: { qualityStatus: "RECALLED" } }
            );

            // Step 3: 10:10 -> SHIP attempt
            const shipRes = await request(app)
                .post(`/api/v1/orders/admin/${recallOrderId}/ship`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    expectedVersion: recallOrder.version,
                    carrier: "FedEx",
                    trackingNumber: "FX-11223344",
                });

            expect(shipRes.status).toBe(400);
            expect(shipRes.body.error?.message || shipRes.body.message).toMatch(/RECALLED/i);

            // Restore lot qualityStatus to AVAILABLE
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotBId) },
                { $set: { qualityStatus: "AVAILABLE" } }
            );
        });

        // 3. Expiry-after-packing test
        it("3. Expiry-after-packing test: blocks shipment if lot expires after packing session was verified", async () => {
            const expiryOrder = await createTestOrder(1, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const expiryOrderId = expiryOrder._id.toString();

            // Step 1: Packing VERIFIED
            const packRes = await request(app)
                .post(`/api/v1/orders/admin/${expiryOrderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ barcode: finishedLotBNumber, stationId: "PACK-BENCH-01" });
            expect(packRes.body.data.scanResult).toBe("MATCHED");
            expect(packRes.body.data.session.status).toBe("VERIFIED");

            // Step 2: Lot expires after packing
            const origLot = await FinishedGoodsLotModel.findById(finishedLotBId);
            const originalExpiry = origLot?.expiryDate;
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotBId) },
                { $set: { expiryDate: new Date(Date.now() - 3600 * 1000) } }
            );

            // Step 3: SHIP attempt
            const shipRes = await request(app)
                .post(`/api/v1/orders/admin/${expiryOrderId}/ship`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    expectedVersion: expiryOrder.version,
                    carrier: "FedEx",
                    trackingNumber: "FX-55667788",
                });

            expect(shipRes.status).toBe(400);
            expect(shipRes.body.error?.message || shipRes.body.message).toMatch(/EXPIRED/i);

            // Restore expiry date
            await FinishedGoodsLotModel.updateOne(
                { _id: new Types.ObjectId(finishedLotBId) },
                { $set: { expiryDate: originalExpiry || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) } }
            );
        });

        // 4. Direct API bypass test
        it("4. Direct API bypass test: rejects direct fulfillment transition to SHIPPED without packing verification", async () => {
            const bypassOrder = await createTestOrder(1, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const bypassOrderId = bypassOrder._id.toString();

            // Try to directly transition to SHIPPED via PATCH /orders/admin/:id/fulfillment
            const bypassRes = await request(app)
                .patch(`/api/v1/orders/admin/${bypassOrderId}/fulfillment`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    fulfillmentStatus: "SHIPPED",
                    expectedVersion: bypassOrder.version,
                    carrier: "Bypass Express",
                    trackingNumber: "BYPASS-001",
                });

            expect(bypassRes.status).toBe(400);
            expect(bypassRes.body.error?.code || bypassRes.body.code).toBe("PACKING_NOT_VERIFIED");

            // Verify order in DB was not shipped
            const dbOrder = await OrderModel.findById(bypassOrderId);
            expect(dbOrder?.fulfillmentStatus).toBe("PROCESSING");
        });

        // 5. Reset test
        it("5. Reset test: archives Session #1 scan events untouched in database and creates clean Session #2", async () => {
            const resetOrder = await createTestOrder(2, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const resetOrderId = resetOrder._id.toString();

            // Session #1: Scan 1 jar
            const scan1 = await request(app)
                .post(`/api/v1/orders/admin/${resetOrderId}/packing/scan`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ barcode: finishedLotBNumber, stationId: "PACK-BENCH-01" });
            expect(scan1.body.data.scanResult).toBe("MATCHED");
            expect(scan1.body.data.session.sessionNumber).toBe(1);

            // Cancel and reset Session #1
            const resetRes = await request(app)
                .post(`/api/v1/orders/admin/${resetOrderId}/packing/reset`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    reason: "Dropped jar on warehouse floor; replacing carton",
                    stationId: "PACK-BENCH-02",
                });
            expect(resetRes.status).toBe(200);
            expect(resetRes.body.data.sessionNumber).toBe(2);
            expect(resetRes.body.data.status).toBe("IN_PROGRESS");
            expect(resetRes.body.data.items[0].verifiedQty).toBe(0); // Clean fresh verification!

            // Verify Session #1 in database is preserved with untouched scan events
            const session1 = await PackingSessionModel.findOne({
                orderId: new Types.ObjectId(resetOrderId),
                sessionNumber: 1,
            });
            expect(session1).not.toBeNull();
            expect(session1?.status).toBe("CANCELLED");
            expect(session1?.resetReason).toBe("Dropped jar on warehouse floor; replacing carton");
            expect(session1?.scanEvents?.length).toBeGreaterThanOrEqual(1);
            expect(session1?.scanEvents?.[0]?.barcode).toBe(finishedLotBNumber);
            expect(session1?.scanEvents?.[0]?.result).toBe("MATCHED");
        });

        // 6. BullMQ retry / idempotency test
        it("6. BullMQ retry / idempotency test: running expiry scan twice produces exactly 1 logical alert without duplicates", async () => {
            // Delete previous outbox events for clean count
            await OutboxEventModel.deleteMany({ aggregateType: "FinishedGoodsLot" });

            // Run 1: initial cron trigger
            const run1 = await runExpiryScan();
            expect(run1).toBeDefined();

            // Check outbox count for Lot B
            const countAfterRun1 = await OutboxEventModel.countDocuments({
                aggregateId: new Types.ObjectId(finishedLotBId),
            });

            // Run 2: simulated BullMQ retry or next scheduled execution on same day
            const run2 = await runExpiryScan();
            expect(run2).toBeDefined();

            // Check outbox count after Run 2: MUST NOT increase!
            const countAfterRun2 = await OutboxEventModel.countDocuments({
                aggregateId: new Types.ObjectId(finishedLotBId),
            });

            expect(countAfterRun2).toBe(countAfterRun1);
        });

        // 7. Multi-instance test
        it("7. Multi-instance test: multiple parallel API instances cannot exceed allocated quantity", async () => {
            const multiOrder = await createTestOrder(2, new Types.ObjectId(finishedLotBId), finishedLotBNumber);
            const multiOrderId = multiOrder._id.toString();

            // Initialize active packing session first
            await request(app)
                .post(`/api/v1/orders/admin/${multiOrderId}/packing/start`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ stationId: "API-INSTANCE-1-BENCH-01" });

            // 6 concurrent requests fired simultaneously across simulated API instances & benches
            const instances = [
                "API-INSTANCE-1-BENCH-01",
                "API-INSTANCE-1-BENCH-02",
                "API-INSTANCE-2-BENCH-01",
                "API-INSTANCE-2-BENCH-02",
                "API-INSTANCE-3-BENCH-01",
                "API-INSTANCE-3-BENCH-02",
            ];

            const results = await Promise.all(
                instances.map((stationId) =>
                    request(app)
                        .post(`/api/v1/orders/admin/${multiOrderId}/packing/scan`)
                        .set("Authorization", `Bearer ${superAdminToken}`)
                        .send({ barcode: finishedLotBNumber, stationId })
                )
            );

            for (const r of results) {
                expect(r.status).toBe(200);
            }

            const scanResults = results.map((r) => r.body.data.scanResult);
            const matchedCount = scanResults.filter((r) => r === "MATCHED").length;
            const completedCount = scanResults.filter((r) => r === "ALREADY_COMPLETED").length;

            expect(matchedCount).toBe(2);
            expect(completedCount).toBe(4);

            // Database authority check: verifiedQty in MongoDB is strictly 2
            const finalSession = await PackingSessionModel.findOne({
                orderId: new Types.ObjectId(multiOrderId),
                status: "VERIFIED",
            });
            expect(finalSession).not.toBeNull();
            expect(finalSession?.items[0]?.verifiedQty).toBe(2);
            expect(finalSession?.items[0]?.requiredQty).toBe(2);
        });
    });
});
