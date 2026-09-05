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
import { inventoryService } from "../modules/inventory/inventory.service.js";
import { inventoryRepository } from "../modules/inventory/inventory.repository.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Inventory Module Architecture & Concurrency Tests", () => {
    let superAdminToken: string;
    let supportToken: string;
    let customerToken: string;

    let testProductId: string;
    let testVariantId: string;
    let secondaryVariantId: string;

    beforeAll(async () => {
        await connectDatabase();
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await StockMovementModel.deleteMany({});
        await ReservationModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // 1. Admin login
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        superAdminToken = adminLogin.body.data.accessToken;

        // 2. Staff user without update permissions
        await request(app)
            .post("/api/v1/admin/users")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                email: "support.inventory@shopsphere.com",
                password: "Password123!",
                firstName: "Support",
                lastName: "Agent",
                role: "SUPPORT_AGENT",
            });

        const supportLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "support.inventory@shopsphere.com",
                password: "Password123!",
            });
        supportToken = supportLogin.body.data.accessToken;

        // 3. Customer login
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "shopper.inventory@example.com",
                password: "Password123!",
                firstName: "Shopper",
                lastName: "User",
            });

        const custLogin = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "shopper.inventory@example.com",
                password: "Password123!",
            });
        customerToken = custLogin.body.data.accessToken;

        // 4. Seed Category & Product with variants
        const category = await CategoryModel.create({
            name: "Inventory Test Category",
            slug: "inventory-test-cat",
        });

        testVariantId = new Types.ObjectId().toString();
        secondaryVariantId = new Types.ObjectId().toString();

        const product = await ProductModel.create({
            title: "Pro Gaming Keyboard",
            slug: "pro-gaming-keyboard",
            categoryId: category._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            variants: [
                {
                    id: testVariantId,
                    sku: "KEY-RGB-001",
                    title: "RGB Mechanical",
                    prices: [{ currency: "USD", amount: 12000 }],
                },
                {
                    id: secondaryVariantId,
                    sku: "KEY-WHT-002",
                    title: "White Minimalist",
                    prices: [{ currency: "USD", amount: 13000 }],
                },
            ],
        });

        testProductId = product._id.toString();
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    beforeEach(async () => {
        await InventoryModel.deleteMany({});
        await StockMovementModel.deleteMany({});
        await ReservationModel.deleteMany({});
    });

    /* -------------------------------------------------------------------------- */
    /* 1. Derived Available (Non-persisted)                                       */
    /* -------------------------------------------------------------------------- */
    it("1. Does not persist available field in MongoDB, but derives it correctly in response", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 100,
            safetyStock: 10,
            reorderThreshold: 15,
        });

        // Update reserved to 20
        inventory.reserved = 20;
        await inventory.save();

        // Check raw document in MongoDB
        const rawDoc = await InventoryModel.findById(inventory._id).lean();
        expect(rawDoc).toBeDefined();
        // available must NOT be stored in MongoDB collection
        expect(rawDoc!.hasOwnProperty("available")).toBe(false);

        // Fetch via Admin API and verify computed available = max(0, 100 - 20 - 10) = 70
        const res = await request(app)
            .get(`/api/v1/admin/inventory/${inventory._id.toString()}`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.onHand).toBe(100);
        expect(res.body.data.reserved).toBe(20);
        expect(res.body.data.safetyStock).toBe(10);
        expect(res.body.data.available).toBe(70);
        expect(res.body.data.isLowStock).toBe(false);
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Separate Physical Reservation from Backorders                            */
    /* -------------------------------------------------------------------------- */
    it("2. Separates physical reservation from backorders when demand is covered", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
            safetyStock: 0,
        });

        const res = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_phys_001",
                items: [
                    {
                        variantId: testVariantId,
                        quantity: 15,
                    },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0].reservedPhysical).toBe(15);
        expect(res.body.data.items[0].backordered).toBe(0);

        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.onHand).toBe(50);
        expect(updatedInv!.reserved).toBe(15);
        expect(updatedInv!.backordered).toBe(0);
        expect(updatedInv!.available).toBe(35);
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Backorders Demand Decoupled from Physical Stock                          */
    /* -------------------------------------------------------------------------- */
    it("3. Routes excess demand to backordered when allowBackorder is true", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 10,
            safetyStock: 0,
            allowBackorder: true,
        });

        // Request 15 units (10 physical available, 5 should become backordered)
        const res = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_backorder_001",
                items: [
                    {
                        variantId: testVariantId,
                        quantity: 15,
                    },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0].reservedPhysical).toBe(10);
        expect(res.body.data.items[0].backordered).toBe(5);

        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.onHand).toBe(10);
        expect(updatedInv!.reserved).toBe(10);
        expect(updatedInv!.backordered).toBe(5);
        expect(updatedInv!.available).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Insufficient Stock Rejection when allowBackorder is false               */
    /* -------------------------------------------------------------------------- */
    it("4. Rejects reservation with INSUFFICIENT_STOCK when allowBackorder is false", async () => {
        await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 5,
            safetyStock: 0,
            allowBackorder: false,
        });

        const res = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_fail_001",
                items: [
                    {
                        variantId: testVariantId,
                        quantity: 10,
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    });

    /* -------------------------------------------------------------------------- */
    /* 5 & 13. Inventory update + movement ledger are atomic                      */
    /* -------------------------------------------------------------------------- */
    it("5 & 13. Atomically updates inventory and inserts movement ledger entry", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 40,
        });

        const res = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_atomic_001",
                items: [
                    {
                        variantId: testVariantId,
                        quantity: 10,
                    },
                ],
            });

        expect(res.status).toBe(201);

        const movements = await StockMovementModel.find({
            inventoryId: inventory._id,
            type: "RESERVATION_HOLD",
        });

        expect(movements.length).toBe(1);
        const m = movements[0]!;
        expect(m.previousReserved).toBe(0);
        expect(m.newReserved).toBe(10);
        expect(m.referenceType).toBe("CHECKOUT");
        expect(m.referenceId).toBe("chk_atomic_001");
    });

    /* -------------------------------------------------------------------------- */
    /* 6 & 14. Failed movement insert rolls back stock change                     */
    /* -------------------------------------------------------------------------- */
    it("6 & 14. Rolls back inventory mutation if movement insert fails", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
            safetyStock: 0,
        });

        // Temporarily spy on StockMovementModel.prototype.save to simulate crash
        const originalSave = StockMovementModel.prototype.save;
        StockMovementModel.prototype.save = async function () {
            throw new Error("Simulated database write error during movement creation");
        };

        try {
            await expect(
                inventoryService.reserveStock({
                    checkoutId: "chk_crash_001",
                    items: [
                        {
                            variantId: testVariantId,
                            quantity: 10,
                        },
                    ],
                })
            ).rejects.toThrow("Simulated database write error during movement creation");
        } finally {
            StockMovementModel.prototype.save = originalSave;
        }

        // Inventory must remain untouched (reserved = 0)
        const checkDoc = await InventoryModel.findById(inventory._id);
        expect(checkDoc!.reserved).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 7 & 15. Multi-item reservation rolls back all items if one fails           */
    /* -------------------------------------------------------------------------- */
    it("7 & 15. Multi-item reservation rolls back all items if one fails (all-or-nothing)", async () => {
        const inv1 = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 100,
            allowBackorder: false,
        });

        const inv2 = await inventoryRepository.create({
            productId: testProductId,
            variantId: secondaryVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 2, // Only 2 in stock
            allowBackorder: false,
        });

        // Request 5 of inv1 (plenty in stock) and 10 of inv2 (depleted)
        const res = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_multi_001",
                items: [
                    { variantId: testVariantId, quantity: 5 },
                    { variantId: secondaryVariantId, quantity: 10 },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

        // Verify inv1 was rolled back completely
        const check1 = await InventoryModel.findById(inv1._id);
        const check2 = await InventoryModel.findById(inv2._id);
        expect(check1!.reserved).toBe(0);
        expect(check2!.reserved).toBe(0);

        // No movements should have been committed for this checkout
        const movements = await StockMovementModel.find({ referenceId: "chk_multi_001" });
        expect(movements.length).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 8 & 16. Duplicate reservation request is idempotent                        */
    /* -------------------------------------------------------------------------- */
    it("8 & 16. Duplicate reservation request is idempotent and does not double-reserve", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
            allowBackorder: false,
        });

        const idempotencyKey = "idem-key-unique-789";

        // First attempt
        const res1 = await request(app)
            .post("/api/v1/reservations")
            .set("X-Idempotency-Key", idempotencyKey)
            .send({
                checkoutId: "chk_idem_001",
                items: [{ variantId: testVariantId, quantity: 5 }],
            });

        expect(res1.status).toBe(201);
        const reservationId1 = res1.body.data.id;

        // Second retry with same key
        const res2 = await request(app)
            .post("/api/v1/reservations")
            .set("X-Idempotency-Key", idempotencyKey)
            .send({
                checkoutId: "chk_idem_001",
                items: [{ variantId: testVariantId, quantity: 5 }],
            });

        expect(res2.status).toBe(201);
        expect(res2.body.data.id).toBe(reservationId1);

        // Reserved must remain exactly 5, NOT 10!
        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.reserved).toBe(5);
    });

    /* -------------------------------------------------------------------------- */
    /* 9 & 17. Concurrent release cannot make reserved negative                   */
    /* -------------------------------------------------------------------------- */
    it("9 & 17. Release cannot make reserved or backordered negative", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
        });

        // Attempting to release when reserved is 0
        await expect(
            inventoryRepository.atomicReleaseWithMovement(
                {
                    inventoryId: inventory._id,
                    reservedPhysical: 10,
                    backordered: 0,
                    referenceType: "CHECKOUT",
                    referenceId: "chk_neg_release",
                },
                null as any
            )
        ).rejects.toThrow();

        const checkDoc = await InventoryModel.findById(inventory._id);
        expect(checkDoc!.reserved).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 10 & 18. Concurrent commit cannot make reserved negative                   */
    /* -------------------------------------------------------------------------- */
    it("10 & 18. Commit cannot make onHand or reserved negative", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 10,
        });

        await expect(
            inventoryRepository.atomicCommitWithMovement(
                {
                    inventoryId: inventory._id,
                    reservedPhysical: 15,
                    referenceId: "chk_neg_commit",
                },
                null as any
            )
        ).rejects.toThrow();

        const checkDoc = await InventoryModel.findById(inventory._id);
        expect(checkDoc!.onHand).toBe(10);
        expect(checkDoc!.reserved).toBe(0);
    });

    /* -------------------------------------------------------------------------- */
    /* 11 & 19. OCC conflict on threshold update → 409                            */
    /* -------------------------------------------------------------------------- */
    it("11 & 19. Returns 409 Conflict when expectedVersion does not match", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
            safetyStock: 5,
        });

        expect(inventory.version).toBe(1);

        // Attempt update with stale version
        const res = await request(app)
            .patch(`/api/v1/admin/inventory/${inventory._id.toString()}/thresholds`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                expectedVersion: 99,
                safetyStock: 20,
            });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("OCC_CONFLICT");
    });

    /* -------------------------------------------------------------------------- */
    /* 12. OCC success on threshold update                                        */
    /* -------------------------------------------------------------------------- */
    it("12. Successfully updates thresholds and increments version when expectedVersion matches", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
            safetyStock: 5,
        });

        const res = await request(app)
            .patch(`/api/v1/admin/inventory/${inventory._id.toString()}/thresholds`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                expectedVersion: 1,
                safetyStock: 12,
                reorderThreshold: 25,
                allowBackorder: true,
            });

        expect(res.status).toBe(200);
        expect(res.body.data.safetyStock).toBe(12);
        expect(res.body.data.reorderThreshold).toBe(25);
        expect(res.body.data.allowBackorder).toBe(true);
        expect(res.body.data.version).toBe(2);
    });

    /* -------------------------------------------------------------------------- */
    /* 13. Movement Ledger Immutability                                           */
    /* -------------------------------------------------------------------------- */
    it("13. Strictly forbids update and delete on StockMovement records", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 20,
        });

        const movement = await StockMovementModel.findOne({ inventoryId: inventory._id });
        expect(movement).toBeDefined();

        // Attempt direct Mongoose update
        await expect(
            StockMovementModel.updateOne(
                { _id: movement!._id },
                { $set: { quantityDelta: 999 } }
            )
        ).rejects.toThrow("StockMovement records are strictly immutable");

        // Attempt direct Mongoose delete
        await expect(
            StockMovementModel.deleteOne({ _id: movement!._id })
        ).rejects.toThrow("StockMovement records are strictly immutable");
    });

    /* -------------------------------------------------------------------------- */
    /* 14. Public stock API privacy masking                                       */
    /* -------------------------------------------------------------------------- */
    it("14. Public availability endpoint masks raw counts for competitive privacy", async () => {
        const inv = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 4218,
            safetyStock: 5,
            reorderThreshold: 10,
        });
        inv.reserved = 10;
        await inv.save();

        const res = await request(app).get(
            `/api/v1/products/${testProductId}/variants/${testVariantId}/availability`
        );

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual({
            productId: testProductId,
            variantId: testVariantId,
            isInStock: true,
            isLowStock: false,
            allowBackorder: false,
        });

        // Verify zero leakage of raw numbers
        expect(res.body.data.onHand).toBeUndefined();
        expect(res.body.data.reserved).toBeUndefined();
        expect(res.body.data.safetyStock).toBeUndefined();
    });

    /* -------------------------------------------------------------------------- */
    /* 15. Reservation Fulfillment (Commit)                                       */
    /* -------------------------------------------------------------------------- */
    it("15. Commit transitions reservation to CONFIRMED and decrements physical onHand and reserved", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
        });

        const resCreate = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_commit_001",
                items: [{ variantId: testVariantId, quantity: 8 }],
            });

        expect(resCreate.status).toBe(201);
        const reservationId = resCreate.body.data.id;

        const resCommit = await request(app).post(
            `/api/v1/reservations/${reservationId}/commit`
        );

        expect(resCommit.status).toBe(200);
        expect(resCommit.body.data.status).toBe("CONFIRMED");

        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.onHand).toBe(42);
        expect(updatedInv!.reserved).toBe(0);

        const commitMovement = await StockMovementModel.findOne({
            inventoryId: inventory._id,
            type: "RESERVATION_COMMIT",
        });
        expect(commitMovement).toBeDefined();
        expect(commitMovement!.quantityDelta).toBe(-8);
    });

    /* -------------------------------------------------------------------------- */
    /* 16. Reservation Expiration Worker                                          */
    /* -------------------------------------------------------------------------- */
    it("16. Automatic expiration worker releases stale reservations back to available stock", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 30,
        });

        // Create reservation with past expiration date
        const resCreate = await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_expired_worker",
                ttlMinutes: 1,
                items: [{ variantId: testVariantId, quantity: 10 }],
            });

        const reservationId = resCreate.body.data.id;

        // Force expired timestamp
        await ReservationModel.findByIdAndUpdate(reservationId, {
            expiresAt: new Date(Date.now() - 60000),
        });

        // Run worker
        const expiredCount = await inventoryService.expireStaleReservations();
        expect(expiredCount).toBe(1);

        const expiredReservation = await ReservationModel.findById(reservationId);
        expect(expiredReservation!.status).toBe("EXPIRED");

        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.reserved).toBe(0);
        expect(updatedInv!.available).toBe(30);
    });

    /* -------------------------------------------------------------------------- */
    /* 17. Admin Manual Adjustment                                                */
    /* -------------------------------------------------------------------------- */
    it("17. Admin can manually adjust inventory with recorded audit actor and reason", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 50,
        });

        const res = await request(app)
            .post("/api/v1/admin/inventory/adjust")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                inventoryId: inventory._id.toString(),
                delta: 25,
                reason: "Received new supplier shipment batch #A45",
            });

        expect(res.status).toBe(200);
        expect(res.body.data.inventory.onHand).toBe(75);

        const movement = await StockMovementModel.findOne({
            inventoryId: inventory._id,
            reason: "Received new supplier shipment batch #A45",
        });

        expect(movement).toBeDefined();
        expect(movement!.quantityDelta).toBe(25);
        expect(movement!.actor?.email).toBe("superadmin@gmail.com");
    });

    /* -------------------------------------------------------------------------- */
    /* 18. Admin Adjustment Guard against negative stock                          */
    /* -------------------------------------------------------------------------- */
    it("18. Admin cannot adjust stock count below active reservations", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 20,
        });

        // Reserve 15
        await request(app)
            .post("/api/v1/reservations")
            .send({
                checkoutId: "chk_guard_adj",
                items: [{ variantId: testVariantId, quantity: 15 }],
            });

        // Try to deduct 10 (which would leave 10 onHand < 15 reserved)
        const res = await request(app)
            .post("/api/v1/admin/inventory/adjust")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                inventoryId: inventory._id.toString(),
                delta: -10,
                reason: "Damaged inventory write-off",
            });

        expect(res.status).toBe(400);
    });

    /* -------------------------------------------------------------------------- */
    /* 19. RBAC Enforcement for Inventory Operations                              */
    /* -------------------------------------------------------------------------- */
    it("19. Rejects inventory adjustments from unauthorized or customer roles", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 10,
        });

        // Customer cannot adjust
        const resCust = await request(app)
            .post("/api/v1/admin/inventory/adjust")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                inventoryId: inventory._id.toString(),
                delta: 10,
                reason: "Hacking stock",
            });

        expect(resCust.status).toBe(403);

        // Support Agent has inventory.read but NOT inventory.adjust
        const resSupport = await request(app)
            .post("/api/v1/admin/inventory/adjust")
            .set("Authorization", `Bearer ${supportToken}`)
            .send({
                inventoryId: inventory._id.toString(),
                delta: 10,
                reason: "Support attempt",
            });

        expect(resSupport.status).toBe(403);
    });

    /* -------------------------------------------------------------------------- */
    /* 20. Concurrent Reservation Stress Test (Race Condition Resolution)         */
    /* -------------------------------------------------------------------------- */
    it("20. Concurrently executes 20 parallel reservations against 5 units without race conditions", async () => {
        const inventory = await inventoryRepository.create({
            productId: testProductId,
            variantId: testVariantId,
            warehouseId: DEFAULT_WAREHOUSE_ID,
            onHand: 5,
            safetyStock: 0,
            allowBackorder: false,
        });

        // Launch 20 concurrent reservation attempts of 1 unit each
        const promises = Array.from({ length: 20 }, (_, idx) =>
            request(app)
                .post("/api/v1/reservations")
                .send({
                    checkoutId: `chk_stress_${idx}`,
                    items: [{ variantId: testVariantId, quantity: 1 }],
                })
        );

        const results = await Promise.all(promises);

        const successes = results.filter((r) => r.status === 201);
        const rejections = results.filter((r) => r.status === 400);

        // Exactly 5 must succeed
        expect(successes.length).toBe(5);
        // Exactly 15 must fail
        expect(rejections.length).toBe(15);

        // Verify inventory state
        const updatedInv = await InventoryModel.findById(inventory._id);
        expect(updatedInv!.onHand).toBe(5);
        expect(updatedInv!.reserved).toBe(5);
        expect(updatedInv!.available).toBe(0);

        // Exactly 5 reservation hold movements created
        const holdMovements = await StockMovementModel.find({
            inventoryId: inventory._id,
            type: "RESERVATION_HOLD",
        });
        expect(holdMovements.length).toBe(5);
    });
});
