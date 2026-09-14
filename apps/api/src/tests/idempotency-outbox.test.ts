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
import { RawMaterialModel } from "../modules/manufacturing/raw-material.model.js";
import { RawMaterialLotModel } from "../modules/manufacturing/raw-material-lot.model.js";
import { RecipeModel } from "../modules/manufacturing/recipe.model.js";
import { ProductionRunModel } from "../modules/manufacturing/production-run.model.js";
import { IdempotencyRecordModel } from "../modules/idempotency/idempotency.model.js";
import { OutboxEventModel } from "../modules/outbox/outbox.model.js";
import { QueueJobModel } from "../modules/queues/queue-job.model.js";
import { RepackagingRunModel } from "../modules/manufacturing/repackaging-run.model.js";
import { outboxService } from "../modules/outbox/outbox.service.js";
import { outboxDispatcher } from "../modules/outbox/outbox.dispatcher.js";
import { runExpiryScan } from "../modules/queues/workers/expiry-monitor.worker.js";
import { processDocumentJob } from "../modules/queues/workers/document.worker.js";
import { closeQueues } from "../modules/queues/queue.client.js";
import { hashPassword } from "../utils/password.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Idempotency, Transactional Outbox & Food FEFO Expiry Architecture Tests", () => {
    let superAdminToken: string;
    let adminBToken: string;
    let productId: string;
    let variantId: string;
    let rawMaterialId: string;
    let lotId: string;
    let recipeId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RawMaterialLotModel.deleteMany({});
        await RecipeModel.deleteMany({});
        await ProductionRunModel.deleteMany({});
        await RepackagingRunModel.deleteMany({});
        await IdempotencyRecordModel.deleteMany({});
        await OutboxEventModel.deleteMany({});
        await QueueJobModel.deleteMany({});

        await OutboxEventModel.syncIndexes();
        await IdempotencyRecordModel.syncIndexes();
        await QueueJobModel.syncIndexes();

        await seedDefaultSuperAdmin();

        // 1a. Admin A (Super Admin) login
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        expect(adminLogin.status).toBe(200);
        superAdminToken = adminLogin.body.data.accessToken;

        // 1b. Admin B (Staff Admin) setup & login for multi-admin tests
        const pwHash = await hashPassword("admin@123");
        await UserModel.create({
            email: "admin_b@gmail.com",
            passwordHash: pwHash,
            firstName: "Staff",
            lastName: "AdminB",
            role: "ADMIN",
            isActive: true,
        });

        const adminBLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "admin_b@gmail.com",
                password: "admin@123",
            });

        expect(adminBLogin.status).toBe(200);
        adminBToken = adminBLogin.body.data.accessToken;

        // 2. Setup Category & Product
        const categoryRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Organic Flours",
                slug: "organic-flours-" + Date.now(),
            });

        const prodRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Stone Ground Atta 1kg",
                slug: "stone-ground-atta-" + Date.now(),
                categoryId: categoryRes.body.data.id,
                baseCurrency: "INR",
                variants: [
                    {
                        sku: "ATTA-1KG-" + Date.now(),
                        title: "1kg Pack",
                        prices: [{ currency: "INR", amount: 85, costAmount: 50 }],
                    },
                ],
            });

        productId = prodRes.body.data.id;
        variantId = prodRes.body.data.variants[0].id;

        // 3. Setup Raw Material (Wheat)
        const rmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Sharbati Wheat",
                code: "WHEAT-SHAR-" + Date.now(),
                category: "GRAIN",
                unit: "kg",
                reorderThreshold: 50,
            });

        rawMaterialId = rmRes.body.data.id;

        // 4. Setup Purchase Intake (200kg)
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);

        const intakeRes = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId,
                quantity: 200,
                unit: "kg",
                costPerUnit: 35,
                sourceType: "EXTERNAL_VENDOR",
                expiryDate: futureDate.toISOString(),
                supplier: {
                    name: "Green Farms Farmer Producer Co.",
                    invoiceNumber: "INV-FARMS-991",
                },
            });

        lotId = intakeRes.body.data.lot.id || intakeRes.body.data.lot._id;

        // 5. Setup Recipe (100 units yield from 105kg wheat)
        const recipeRes = await request(app)
            .post("/api/v1/admin/manufacturing/recipes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Atta Milling Recipe v1",
                code: "BOM-ATTA-1KG",
                productId,
                variantId,
                batchYield: {
                    quantity: 100,
                    unit: "pack",
                },
                shelfLifeDays: 90,
                ingredients: [
                    {
                        rawMaterialId,
                        quantity: 105,
                        unit: "kg",
                        wastagePercent: 0,
                    },
                ],
                packagingMaterials: [],
                laborOverheadCost: 0,
            });

        expect(recipeRes.status).toBe(201);
        recipeId = recipeRes.body.data.id || recipeRes.body.data._id;
    }, 60000);

    afterAll(async () => {
        await closeQueues();
        await disconnectDatabase();
    });

    // -------------------------------------------------------------------------
    // Phase 1: Idempotency Replay Protection (Zero Duplicate Execution)
    // -------------------------------------------------------------------------
    it("Phase 1: Idempotency Replay Protection (Same Key + Body returns cached response, zero duplicate deductions)", async () => {
        const idempotencyKey = "IDEMP-PROD-BATCH-" + Date.now();
        const payload = {
            recipeId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            plannedQuantity: 100,
            actualQuantity: 100,
            notes: "Initial Batch Execution",
        };

        // First Execution: should succeed and create batch
        const firstCall = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .set("Idempotency-Key", idempotencyKey)
            .send(payload);

        expect(firstCall.status).toBe(201);
        expect(firstCall.body.success).toBe(true);
        const batchNumber = firstCall.body.data.batchNumber;

        // Check DB state after first call
        const runCountAfterFirst = await ProductionRunModel.countDocuments({ recipeId });
        expect(runCountAfterFirst).toBe(1);

        const rmAfterFirst = await RawMaterialModel.findById(rawMaterialId);
        expect(rmAfterFirst?.currentStock).toBe(95); // 200kg - 105kg = 95kg

        // Second Execution with IDENTICAL Idempotency-Key & Payload (simulates network retry / double click)
        const secondCall = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .set("Idempotency-Key", idempotencyKey)
            .send(payload);

        expect(secondCall.status).toBe(201);
        expect(secondCall.headers["x-idempotent-replay"]).toBe("true");
        expect(secondCall.body.data.batchNumber).toBe(batchNumber);

        // Verification: Zero duplicate batch created, stock NOT deducted twice!
        const runCountAfterSecond = await ProductionRunModel.countDocuments({ recipeId });
        expect(runCountAfterSecond).toBe(1);

        const rmAfterSecond = await RawMaterialModel.findById(rawMaterialId);
        expect(rmAfterSecond?.currentStock).toBe(95); // Still 95kg! Never deducted 2x!
    });

    // -------------------------------------------------------------------------
    // Phase 2: Idempotency Tamper Guard (Reused Key with Different Body Rejected)
    // -------------------------------------------------------------------------
    it("Phase 2: Idempotency Tamper Guard (Reusing same key with altered payload returns 409 IDEMPOTENCY_KEY_REUSED)", async () => {
        const tamperKey = "IDEMP-TAMPER-" + Date.now();

        // 1. Initial valid call
        const validCall = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .set("Idempotency-Key", tamperKey)
            .send({
                rawMaterialId,
                quantity: 10,
                unit: "kg",
                costPerUnit: 40,
                sourceType: "EXTERNAL_VENDOR",
                expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
            });

        expect(validCall.status).toBe(201);

        // 2. Tampered call: reusing same key with different quantity (50kg instead of 10kg)
        const tamperedCall = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .set("Idempotency-Key", tamperKey)
            .send({
                rawMaterialId,
                quantity: 50, // Altered payload!
                unit: "kg",
                costPerUnit: 40,
                sourceType: "EXTERNAL_VENDOR",
                expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
            });

        expect(tamperedCall.status).toBe(409);
        expect(tamperedCall.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
        expect(tamperedCall.body.error.message).toContain("different parameters");
    });

    // -------------------------------------------------------------------------
    // Phase 3: Idempotency In-Progress Guard (Returns 409 + Retry-After)
    // -------------------------------------------------------------------------
    it("Phase 3: Idempotency In-Progress Guard (Concurrent duplicate receives 409 IDEMPOTENCY_REQUEST_IN_PROGRESS)", async () => {
        const inProgressKey = "IDEMP-PROGRESS-" + Date.now();
        const testPayload = {
            rawMaterialId,
            quantity: 10,
            unit: "kg",
            costPerUnit: 40,
            sourceType: "EXTERNAL_VENDOR",
            expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        };

        const { computeRequestHash } = await import("../middlewares/idempotency.middleware.js");
        const matchingHash = computeRequestHash(
            "POST",
            "/api/v1/admin/manufacturing/purchases",
            testPayload
        );

        // Manually seed a PENDING idempotency record with the exact matching requestHash
        await IdempotencyRecordModel.create({
            key: inProgressKey,
            scope: (await UserModel.findOne({ email: "superadmin@gmail.com" }))!._id.toString(),
            path: "/api/v1/admin/manufacturing/purchases",
            method: "POST",
            requestHash: matchingHash,
            status: "PENDING",
            expiresAt: new Date(Date.now() + 3600000),
        });

        // Any incoming request with this key while PENDING must be rejected
        const inProgressReq = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .set("Idempotency-Key", inProgressKey)
            .send(testPayload);

        expect(inProgressReq.status).toBe(409);
        expect(inProgressReq.headers["retry-after"]).toBe("2");
        expect(inProgressReq.body.error.code).toBe("IDEMPOTENCY_REQUEST_IN_PROGRESS");
    });

    // -------------------------------------------------------------------------
    // Phase 4: Food Lot Status Separation & FEFO Expiry Refusal
    // -------------------------------------------------------------------------
    it("Phase 4: Food Lot Status Separation & FEFO Expiry Refusal (AVAILABLE vs EXPIRED)", async () => {
        // Create an expired lot (expired yesterday) with 50kg physical balance
        const yesterday = new Date(Date.now() - 86400000);
        const expiredLot = await RawMaterialLotModel.create({
            rawMaterialId: new Types.ObjectId(rawMaterialId),
            lotNumber: "LOT-EXPIRED-TEST-01",
            expiryDate: yesterday,
            receivedDate: new Date(Date.now() - 30 * 86400000),
            initialQuantity: 50,
            availableQuantity: 50,
            unit: "kg",
            costPerUnit: 35,
            sourceType: "EXTERNAL_VENDOR",
            status: "AVAILABLE", // Currently active before scan
            isDepleted: false,
        });

        // 1. Run the FEFO lot expiry scan worker
        const scanResult = await runExpiryScan();
        expect(scanResult.expiredCount).toBeGreaterThanOrEqual(1);
        expect(scanResult.expiredLotNumbers).toContain("LOT-EXPIRED-TEST-01");

        // 2. Verify status separation: status is EXPIRED, but isDepleted is FALSE and quantity is still 50kg!
        const refreshedLot = await RawMaterialLotModel.findById(expiredLot._id);
        expect(refreshedLot?.status).toBe("EXPIRED");
        expect(refreshedLot?.isDepleted).toBe(false);
        expect(refreshedLot?.availableQuantity).toBe(50); // Stock physically exists, not disappeared!

        // 3. Native Query Guard: checkFeasibility MUST NOT allocate this expired lot
        const feasibility = await request(app)
            .get("/api/v1/admin/manufacturing/feasibility")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .query({
                recipeId,
                quantity: 50,
            });

        expect(feasibility.status).toBe(200);
        const allocatedLots = feasibility.body.data.fefoAllocations.map((a: any) => a.lotNumber);
        expect(allocatedLots).not.toContain("LOT-EXPIRED-TEST-01");
    });

    // -------------------------------------------------------------------------
    // Phase 5: Transactional Outbox Event Persistence & DeduplicationKey Safety
    // -------------------------------------------------------------------------
    it("Phase 5: Transactional Outbox Event Persistence & DeduplicationKey Safety", async () => {
        const testDeduplicationKey = "TEST_EVENT:ORDER_999";

        // 1. Record event in outbox
        const event1 = await outboxService.recordEvent({
            eventType: "ORDER_CONFIRMED",
            aggregateType: "Order",
            aggregateId: new Types.ObjectId(),
            deduplicationKey: testDeduplicationKey,
            payload: { orderNumber: "ORD-999", totalAmount: 1500 },
        });

        expect(event1).toBeDefined();
        expect(event1?.status).toBe("PENDING");
        expect(event1?.deduplicationKey).toBe(testDeduplicationKey);

        // 2. Attempting to record identical event with same deduplicationKey returns existing without duplicating
        const event2 = await outboxService.recordEvent({
            eventType: "ORDER_CONFIRMED",
            aggregateType: "Order",
            aggregateId: event1!.aggregateId,
            deduplicationKey: testDeduplicationKey,
            payload: { orderNumber: "ORD-999", totalAmount: 1500 },
        });

        expect(event2?._id.toString()).toBe(event1?._id.toString());

        const eventCount = await OutboxEventModel.countDocuments({ deduplicationKey: testDeduplicationKey });
        expect(eventCount).toBe(1);
    });

    // -------------------------------------------------------------------------
    // Phase 6: Outbox Dispatcher Atomic Processing & BullMQ JobId Deduplication
    // -------------------------------------------------------------------------
    it("Phase 6: Outbox Dispatcher Atomic Processing & Dispatched Transition", async () => {
        // Verify outbox events from our manufacturing production run in Phase 1
        const outboxEvents = await OutboxEventModel.find({
            eventType: "PRODUCTION_BATCH_COMPLETED",
        });

        expect(outboxEvents.length).toBeGreaterThanOrEqual(1);
        const latestEvent = outboxEvents[0]!;
        expect(latestEvent.aggregateType).toBe("ProductionRun");
        expect(latestEvent.status).toBe("PENDING");

        // Manually trigger a batch processing cycle on the OutboxDispatcher
        const processed = await outboxDispatcher.processBatch();
        expect(processed).toBeGreaterThanOrEqual(1);

        // Verify event transitioned to DISPATCHED with processedAt timestamp
        const updatedEvent = await OutboxEventModel.findById(latestEvent._id);
        expect(updatedEvent?.status).toBe("DISPATCHED");
        expect(updatedEvent?.processedAt).toBeDefined();
        expect(updatedEvent?.lockedAt).toBeNull();
    });

    // -------------------------------------------------------------------------
    // Phase 7: Persistent Job Tracking & Worker Idempotency (Crash Before Ack)
    // -------------------------------------------------------------------------
    it("Phase 7: Persistent Job Tracking & Worker Idempotency (Crash Before Ack Simulation)", async () => {
        const testJobId = "outbox:test_event_101:batch-label";
        const jobPayload = {
            id: testJobId,
            queueName: "documents",
            name: "generate-batch-labels",
            data: {
                batchNumber: "MFG-IDEMP-001",
                productTitle: "Stone Ground Atta 1kg",
                actualQuantity: 100,
                aggregateType: "ProductionRun",
                aggregateId: "6aa5293921cbf37d9d8d4d46",
                actor: {
                    id: "user_superadmin_01",
                    email: "superadmin@gmail.com",
                    role: "SUPER_ADMIN",
                },
            },
        };

        // Execution #1: First time processing the job
        const result1 = await processDocumentJob(jobPayload);
        expect(result1.idempotentReplay).toBe(false);
        expect(result1.documentType).toBe("FSSAI_BATCH_LABELS");
        expect(result1.batchNumber).toBe("MFG-IDEMP-001");

        // Check MongoDB persistence in QueueJobModel
        const trackedJob = await QueueJobModel.findOne({ jobId: testJobId });
        expect(trackedJob).toBeDefined();
        expect(trackedJob?.status).toBe("COMPLETED");
        expect(trackedJob?.audit.referenceNumber).toBe("MFG-IDEMP-001");
        expect(trackedJob?.audit.triggeredBy?.email).toBe("superadmin@gmail.com");
        expect(trackedJob?.auditHistory.length).toBe(2); // PROCESSING and COMPLETED
        expect(trackedJob?.durationMs).toBeGreaterThanOrEqual(0);

        // Execution #2: Simulating worker crash before ack, BullMQ retries identical job
        const result2 = await processDocumentJob(jobPayload);
        expect(result2.idempotentReplay).toBe(true);
        expect(result2.batchNumber).toBe("MFG-IDEMP-001");

        // Verify side-effects were skipped and history did NOT re-run
        const recheckJob = await QueueJobModel.findOne({ jobId: testJobId });
        expect(recheckJob?.auditHistory.length).toBe(2); // Zero duplicate execution!
    });

    // -------------------------------------------------------------------------
    // Phase 8: Admin Background Jobs Query API
    // -------------------------------------------------------------------------
    it("Phase 8: Admin Background Jobs Query API (GET /api/v1/admin/jobs with audit filters)", async () => {
        const listRes = await request(app)
            .get("/api/v1/admin/jobs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .query({
                queueName: "documents",
                referenceNumber: "MFG-IDEMP-001",
            });

        expect(listRes.status).toBe(200);
        expect(listRes.body.success).toBe(true);
        expect(listRes.body.data.length).toBe(1);
        expect(listRes.body.data[0].jobId).toBe("outbox:test_event_101:batch-label");
        expect(listRes.body.data[0].audit.referenceNumber).toBe("MFG-IDEMP-001");

        // Fetch single job by ID
        const singleRes = await request(app)
            .get("/api/v1/admin/jobs/outbox:test_event_101:batch-label")
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(singleRes.status).toBe(200);
        expect(singleRes.body.data.status).toBe("COMPLETED");
        expect(singleRes.body.data.auditHistory.length).toBe(2);
    });

    // -------------------------------------------------------------------------
    // Phase 9: Multi-Admin Concurrent Production Reversal Race
    // -------------------------------------------------------------------------
    it("Phase 9: Multi-Admin Concurrent Production Reversal Race (Atomic conditional lock prevents double reversal)", async () => {
        // 1. Intake fresh wheat (150kg)
        const intake = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId,
                quantity: 150,
                unit: "kg",
                costPerUnit: 35,
                sourceType: "EXTERNAL_VENDOR",
                expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            });
        expect(intake.status).toBe(201);

        // 2. Create production run of 50 units
        const prod = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId,
                warehouseId: DEFAULT_WAREHOUSE_ID,
                plannedQuantity: 50,
                actualQuantity: 50,
                notes: "Concurrent Reversal Test Batch",
            });
        expect(prod.status).toBe(201);
        const concBatchId = prod.body.data.id || prod.body.data._id;

        // Verify finished goods inventory onHand before reversal
        const invBefore = await InventoryModel.findOne({
            productId,
            variantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
        });
        const onHandBefore = invBefore?.onHand || 0;

        // 3. Admin A and Admin B SIMULTANEOUSLY trigger full reversal of concBatchId
        const [callA, callB] = await Promise.all([
            request(app)
                .post(`/api/v1/admin/manufacturing/production-runs/${concBatchId}/reverse`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ reason: "Admin A Concurrent Full Reversal" }),
            request(app)
                .post(`/api/v1/admin/manufacturing/production-runs/${concBatchId}/reverse`)
                .set("Authorization", `Bearer ${adminBToken}`)
                .send({ reason: "Admin B Concurrent Full Reversal" }),
        ]);

        const statuses = [callA.status, callB.status].sort();
        // Exactly one call must succeed (200) and the other must be rejected (409 or 400)
        expect(statuses[0]).toBe(200);
        expect([400, 409]).toContain(statuses[1]);

        // 4. Verify DB inventory correctness: OnHand decremented by EXACTLY 50, NOT 100!
        const invAfter = await InventoryModel.findOne({
            productId,
            variantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
        });
        expect(invAfter?.onHand).toBe(onHandBefore - 50);

        // Verify run record status in DB: reversedQuantity is exactly 50, status is REVERSED
        const runDoc = await ProductionRunModel.findById(concBatchId);
        expect(runDoc?.reversedQuantity).toBe(50);
        expect(runDoc?.status).toBe("REVERSED");
    });

    // -------------------------------------------------------------------------
    // Phase 10: Multi-Admin Concurrent Repackaging Reversal Race
    // -------------------------------------------------------------------------
    it("Phase 10: Multi-Admin Concurrent Repackaging Reversal Race (Atomic conditional lock prevents double reversal)", async () => {
        // 1. Create dual-use raw material
        const rmDualRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Whole Cashews Bulk",
                code: "CASHEW-BULK-" + Date.now(),
                category: "GRAIN",
                usage: "BOTH",
                unit: "kg",
                reorderThreshold: 10,
            });
        expect(rmDualRes.status).toBe(201);
        const cashewRmId = rmDualRes.body.data.id;

        // 2. Intake 50kg cashews
        const cashewIntake = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: cashewRmId,
                quantity: 50,
                unit: "kg",
                costPerUnit: 600,
                sourceType: "EXTERNAL_VENDOR",
                expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            });
        expect(cashewIntake.status).toBe(201);
        const cashewLotId = cashewIntake.body.data.lot.id || cashewIntake.body.data.lot._id;

        // 3. Create repackaging run (20 units of 1kg packs)
        const rpkRes = await request(app)
            .post("/api/v1/admin/manufacturing/repackaging")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                sourceRawMaterialId: cashewRmId,
                sourceLotId: cashewLotId,
                targetProductId: productId,
                targetVariantId: variantId,
                packageUnitsProduced: 20,
                unitSizeQuantity: 1,
                unitSizeUnit: "kg",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                notes: "Concurrent Repackaging Test",
            });
        expect(rpkRes.status).toBe(201);
        const rpkId = rpkRes.body.data.id || rpkRes.body.data._id;

        const invBefore = await InventoryModel.findOne({
            productId,
            variantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
        });
        const onHandBefore = invBefore?.onHand || 0;

        // 4. Admin A and Admin B SIMULTANEOUSLY trigger full reversal of rpkId
        const [callA, callB] = await Promise.all([
            request(app)
                .post(`/api/v1/admin/manufacturing/repackaging/${rpkId}/reverse`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({ reason: "Admin A Concurrent Repackaging Reversal" }),
            request(app)
                .post(`/api/v1/admin/manufacturing/repackaging/${rpkId}/reverse`)
                .set("Authorization", `Bearer ${adminBToken}`)
                .send({ reason: "Admin B Concurrent Repackaging Reversal" }),
        ]);

        const statuses = [callA.status, callB.status].sort();
        expect(statuses[0]).toBe(200);
        expect([400, 409]).toContain(statuses[1]);

        // 5. Verify DB: OnHand decremented by EXACTLY 20, NOT 40!
        const invAfter = await InventoryModel.findOne({
            productId,
            variantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
        });
        expect(invAfter?.onHand).toBe(onHandBefore - 20);

        // Verify repackaging run doc: reversedUnits is exactly 20, status is REVERSED
        const rpkDoc = await RepackagingRunModel.findById(rpkId);
        expect(rpkDoc?.reversedUnits).toBe(20);
        expect(rpkDoc?.status).toBe("REVERSED");
    });
});
