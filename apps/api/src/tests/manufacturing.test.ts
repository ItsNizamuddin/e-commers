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
import {
    InventoryModel,
    StockMovementModel,
} from "../modules/inventory/inventory.model.js";
import { RawMaterialModel } from "../modules/manufacturing/raw-material.model.js";
import { RawMaterialLotModel } from "../modules/manufacturing/raw-material-lot.model.js";
import { RawMaterialStockMovementModel } from "../modules/manufacturing/raw-material-ledger.model.js";
import { RecipeModel } from "../modules/manufacturing/recipe.model.js";
import { ProductionRunModel } from "../modules/manufacturing/production-run.model.js";
import { RepackagingRunModel } from "../modules/manufacturing/repackaging-run.model.js";
import { VendorModel } from "../modules/manufacturing/vendor.model.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Food Manufacturing & Raw Material Inventory Architecture Tests", () => {
    let superAdminToken: string;
    let testProductId: string;
    let testVariantId: string;
    let rawMaterialId: string;
    let farmLotId: string;
    let vendorLotId: string;
    let recipeId: string;
    let productionRunId: string;
    let almondRmId: string;
    let almondLotId: string;
    let almondProductId: string;
    let almondVariantId: string;
    let repackagingRunId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await StockMovementModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RawMaterialLotModel.deleteMany({});
        await RawMaterialStockMovementModel.deleteMany({});
        await RecipeModel.deleteMany({});
        await ProductionRunModel.deleteMany({});
        await RepackagingRunModel.deleteMany({});
        await VendorModel.deleteMany({});

        await seedDefaultSuperAdmin();

        // 1. Admin login
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        superAdminToken = adminLogin.body.data.accessToken;

        // 2. Create Category & Product with a Variant for finished goods testing
        const catRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Sweets & Desserts",
                slug: "sweets-desserts",
            });
        const categoryId = catRes.body.data.id;

        const prodRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Premium Besan Ladoo 500g",
                slug: "premium-besan-ladoo-500g",
                categoryId,
                baseCurrency: "INR",
                variants: [
                    {
                        sku: "BL-500G",
                        title: "500g Pack",
                        prices: [
                            {
                                currency: "INR",
                                amount: 250,
                                costAmount: 120,
                            },
                        ],
                    },
                ],
            });
        testProductId = prodRes.body.data.id;
        testVariantId = prodRes.body.data.variants[0].id;
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    it("Phase 1: Raw Material Creation with immutable validation", async () => {
        const res = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: "RM-BESAN-01",
                name: "Organic Besan (Gram Flour)",
                category: "GRAIN",
                unit: "kg",
                reorderThreshold: 5,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe("RM-BESAN-01");
        expect(res.body.data.currentStock).toBe(0);
        expect(res.body.data.averageCost).toBe(0);

        rawMaterialId = res.body.data.id;
    });

    it("Phase 1b: Auto-generate unique Material Code (SKU) and check availability", async () => {
        // 1. Check existing code availability (RM-BESAN-01 was created in Phase 1)
        const checkTaken = await request(app)
            .get("/api/v1/admin/manufacturing/raw-materials/check-code?code=RM-BESAN-01")
            .set("Authorization", `Bearer ${superAdminToken}`);
        expect(checkTaken.status).toBe(200);
        expect(checkTaken.body.data.isAvailable).toBe(false);
        expect(checkTaken.body.data.suggestedCode).toMatch(/^RM-BESAN-01-\d{2}$/);

        // 2. Check fresh unused code availability
        const checkAvailable = await request(app)
            .get("/api/v1/admin/manufacturing/raw-materials/check-code?code=RM-GHEE-PURE")
            .set("Authorization", `Bearer ${superAdminToken}`);
        expect(checkAvailable.status).toBe(200);
        expect(checkAvailable.body.data.isAvailable).toBe(true);

        // 3. Create raw material without providing code (should auto-generate clean unique code from name)
        const autoCreate1 = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Pure Cow Ghee",
                category: "DAIRY",
                unit: "kg",
            });
        expect(autoCreate1.status).toBe(201);
        expect(autoCreate1.body.data.code).toBe("RM-PURE-COW-GHEE");

        // 4. Create second raw material with same name (should auto-resolve collision with unique suffix)
        const autoCreate2 = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Pure Cow Ghee",
                category: "DAIRY",
                unit: "kg",
            });
        expect(autoCreate2.status).toBe(201);
        expect(autoCreate2.body.data.code).toBe("RM-PURE-COW-GHEE-01");
    });

    it("Phase 2: Purchase Intake 1 (External Vendor: 1kg @ ₹100/kg)", async () => {
        const futureExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        const res = await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId,
                lotNumber: "LOT-VENDOR-001",
                quantity: 1,
                unit: "kg",
                costPerUnit: 100,
                expiryDate: futureExpiry,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Golden Agro Mills Ltd",
                    invoiceNumber: "INV-2026-9901",
                },
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        vendorLotId = res.body.data.lot.id;

        // Verify updated Raw Material valuation: 1kg @ ₹100
        const rm = await RawMaterialModel.findById(rawMaterialId);
        expect(rm).not.toBeNull();
        expect(rm!.currentStock).toBe(1);
        expect(rm!.averageCost).toBe(100);
        expect(rm!.lastPurchasePrice).toBe(100);

        // Verify immutable ledger entry
        const ledger = await RawMaterialStockMovementModel.find({ rawMaterialId });
        expect(ledger.length).toBe(1);
        expect(ledger[0]!.type).toBe("PURCHASE_INTAKE");
        expect(ledger[0]!.quantityDelta).toBe(1);
        expect(ledger[0]!.unit).toBe("kg");
    });

    it("Phase 3: Purchase Intake 2 (Own Farm Harvest: 500g for ₹30 total = ₹60/kg rate)", async () => {
        // Earlier expiry date to test FEFO lot priority
        const earlierExpiry = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();

        const res = await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId,
                lotNumber: "LOT-FARM-002",
                quantity: 500,
                unit: "g", // 500 grams = 0.5 kg
                costPerUnit: 60, // ₹60/kg base unit rate => ₹30 total intake value
                expiryDate: earlierExpiry,
                sourceType: "OWN_FARM",
                farmDetails: {
                    farmName: "GreenFields Organic Farm, Plot B",
                    harvestDate: new Date().toISOString(),
                    valuationMethod: "OPERATIONAL_COST",
                },
            });

        expect(res.status).toBe(201);
        farmLotId = res.body.data.lot.id;

        // Verify WAC Calculation:
        // Stock: 1kg + 0.5kg = 1.5kg
        // Total Value: (1kg * 100) + (0.5kg * 60) = 100 + 30 = ₹130
        // WAC: 130 / 1.5 = 86.6666... => ~86.67
        const rm = await RawMaterialModel.findById(rawMaterialId);
        expect(rm).not.toBeNull();
        expect(rm!.currentStock).toBe(1.5);
        expect(Math.round(rm!.averageCost * 100) / 100).toBe(86.67);
        expect(rm!.lastPurchasePrice).toBe(60);

        // Verify ledger has 2 entries
        const ledger = await RawMaterialStockMovementModel.find({ rawMaterialId }).sort({ createdAt: 1 });
        expect(ledger.length).toBe(2);
        expect(ledger[1]!.type).toBe("PURCHASE_INTAKE");
        expect(ledger[1]!.quantityDelta).toBe(0.5);
    });

    it("Phase 4: Recipe (BOM) Formulation with yield and ingredient loss %", async () => {
        const res = await request(app)
            .post("/api/v1/admin/manufacturing/recipes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: "RECIPE-BL-500G",
                name: "Traditional Besan Ladoo 500g Recipe",
                productId: testProductId,
                variantId: testVariantId,
                shelfLifeDays: 60,
                batchYield: {
                    quantity: 2, // Yields 2 finished boxes
                    unit: "pcs",
                },
                ingredients: [
                    {
                        rawMaterialId,
                        quantity: 0.8, // 0.8 kg needed for batch of 2 (0.4kg / box)
                        unit: "kg",
                        wastagePercent: 0,
                    },
                ],
                packagingMaterials: [],
                laborOverheadCost: 10,
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.version).toBe(1);

        recipeId = res.body.data.id;
    });

    it("Phase 5: Pre-Flight Feasibility Check & FEFO Lot Allocation Preview", async () => {
        const res = await request(app)
            .get(`/api/v1/admin/manufacturing/feasibility?recipeId=${recipeId}&quantity=2`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const check = res.body.data;
        expect(check.canProduce).toBe(true);
        expect(check.shortages.length).toBe(0);

        // FEFO Allocation: Requires 0.8kg total
        // LOT-FARM-002 (45d expiry) should be consumed FIRST: 0.5kg
        // LOT-VENDOR-001 (90d expiry) should be consumed NEXT: 0.3kg
        expect(check.fefoAllocations.length).toBe(2);
        expect(check.fefoAllocations[0].lotNumber).toBe("LOT-FARM-002");
        expect(check.fefoAllocations[0].allocatedQuantity).toBe(0.5);
        expect(check.fefoAllocations[1].lotNumber).toBe("LOT-VENDOR-001");
        expect(check.fefoAllocations[1].allocatedQuantity).toBe(0.3);

        // Perishable warning: Farm lot expires in 45 days, but recipe shelf life is 60 days
        expect(check.hasPerishableWarning).toBe(true);
    });

    it("Phase 6: Batch Production Execution & Stock Deposition", async () => {
        const res = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId,
                warehouseId: DEFAULT_WAREHOUSE_ID,
                plannedQuantity: 2,
                actualQuantity: 2,
                manufacturingDate: new Date().toISOString(),
                notes: "Morning test production run",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const run = res.body.data;
        expect(run.status).toBe("COMPLETED");
        expect(run.actualQuantity).toBe(2);
        productionRunId = run.id;

        // Actual cost:
        // Farm: 0.5kg * ₹60 = ₹30
        // Vendor: 0.3kg * ₹100 = ₹30
        // Overhead: ₹10
        // Total = ₹70
        // Unit cost = ₹70 / 2 = ₹35
        expect(run.actualTotalCost).toBe(70);
        expect(run.actualUnitCost).toBe(35);

        // Verify Raw Material balance deducted:
        // 1.5kg - 0.8kg = 0.7kg remaining
        const rm = await RawMaterialModel.findById(rawMaterialId);
        expect(rm).not.toBeNull();
        expect(Math.round(rm!.currentStock * 100) / 100).toBe(0.7);

        // Verify Farm lot is fully depleted (0 available)
        const farmLot = await RawMaterialLotModel.findById(farmLotId);
        expect(farmLot?.availableQuantity).toBe(0);
        expect(farmLot?.isDepleted).toBe(true);

        // Verify Vendor lot has 0.7kg remaining
        const vendorLot = await RawMaterialLotModel.findById(vendorLotId);
        expect(Math.round(vendorLot!.availableQuantity * 100) / 100).toBe(0.7);

        // Verify finished inventory credited by 2 units in store inventory
        const inv = await InventoryModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(testVariantId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(inv).not.toBeNull();
        expect(inv!.onHand).toBe(2);

        // Verify store stock movement logged
        const movement = await StockMovementModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(testVariantId),
            type: "STOCK_RECEIPT",
        });
        expect(movement).not.toBeNull();
        expect(movement!.quantityDelta).toBe(2);
    });

    it("Phase 7: Audited Batch Reversal Flow (Restores Raw Lots & Debits Finished Goods)", async () => {
        const res = await request(app)
            .post(`/api/v1/admin/manufacturing/production-runs/${productionRunId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reason: "Audit reversal test: discovered packaging seal error",
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("REVERSED");
        expect(res.body.data.reversalDetails?.reason).toBe(
            "Audit reversal test: discovered packaging seal error"
        );

        // 1. Raw material stock restored from 0.7kg back to 1.5kg
        const rm = await RawMaterialModel.findById(rawMaterialId);
        expect(rm).not.toBeNull();
        expect(Math.round(rm!.currentStock * 100) / 100).toBe(1.5);

        // 2. Specific lots restored:
        // Farm lot back to 0.5kg and isDepleted is false
        const farmLot = await RawMaterialLotModel.findById(farmLotId);
        expect(farmLot?.availableQuantity).toBe(0.5);
        expect(farmLot?.isDepleted).toBe(false);

        // Vendor lot back to 1.0kg
        const vendorLot = await RawMaterialLotModel.findById(vendorLotId);
        expect(vendorLot?.availableQuantity).toBe(1);

        // 3. Raw stock ledger has counter-entries for MANUFACTURING_REVERSAL
        const reversals = await RawMaterialStockMovementModel.find({
            rawMaterialId,
            type: "MANUFACTURING_REVERSAL",
        });
        expect(reversals.length).toBe(2);

        // 4. Finished store inventory debited back from 2 to 0
        const inv = await InventoryModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(testVariantId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(inv).not.toBeNull();
        expect(inv!.onHand).toBe(0);

        // 5. Store StockMovement logged OUT with DAMAGE_WRITE_OFF and negative delta
        const outMovement = await StockMovementModel.findOne({
            productId: new Types.ObjectId(testProductId),
            variantId: new Types.ObjectId(testVariantId),
            type: "DAMAGE_WRITE_OFF",
        });
        expect(outMovement).not.toBeNull();
        expect(outMovement!.quantityDelta).toBe(-2);
    });

    it("Phase 8: Dual-Use Material Configuration ('usage': 'BOTH') & Product Variant Linkage", async () => {
        // 1. Create a dual-use raw material (e.g. Bulk Almonds)
        const rmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: "RM-ALMOND-BULK",
                name: "California Almonds (Bulk)",
                category: "INGREDIENT",
                usage: "BOTH",
                unit: "kg",
                initialStock: 0,
                reorderThreshold: 10,
            });

        expect(rmRes.status).toBe(201);
        expect(rmRes.body.data.usage).toBe("BOTH");
        almondRmId = rmRes.body.data.id;

        // 2. Create Retail Packaged Product: "Almonds 250g Pouch"
        const prodRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Premium Almonds 250g Pouch",
                slug: "premium-almonds-250g-pouch",
                categoryId: (await CategoryModel.findOne())!._id.toString(),
                baseCurrency: "INR",
                variants: [
                    {
                        sku: "ALM-250G",
                        title: "250g Pouch",
                        prices: [
                            {
                                currency: "INR",
                                amount: 220,
                                costAmount: 150,
                            },
                        ],
                    },
                ],
            });
        expect(prodRes.status).toBe(201);
        almondProductId = prodRes.body.data.id;
        almondVariantId = prodRes.body.data.variants[0].id;

        // 3. Link Retail Product & Variant to Raw Material
        const linkRes = await request(app)
            .patch(`/api/v1/admin/manufacturing/raw-materials/${almondRmId}`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                linkedProductId: almondProductId,
                linkedVariantId: almondVariantId,
            });
        expect(linkRes.status).toBe(200);
        expect(linkRes.body.data.linkedProductId).toBe(almondProductId);
        expect(linkRes.body.data.linkedVariantId).toBe(almondVariantId);

        // 4. Inward Intake of Bulk Almonds (50kg @ ₹600/kg)
        const intakeRes = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: almondRmId,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "California Orchard Importers",
                    invoiceNumber: "INV-ALM-9912",
                },
                quantity: 50,
                unit: "kg",
                totalCost: 30000,
                costPerUnit: 600,
                lotNumber: "LOT-ALMOND-001",
                expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                notes: "Bulk shipment for both ladoo manufacturing and retail repackaging",
            });
        expect(intakeRes.status).toBe(201);
        expect(intakeRes.body.data.rawMaterial.currentStock).toBe(50);
        almondLotId = intakeRes.body.data.lot.id;
    });

    it("Phase 9: Repackaging Run Execution (Bulk Lot to Retail Packs with Lot Traceability)", async () => {
        // Repackage 20 pouches of 250g each (20 * 0.25kg = 5kg) + 0.1kg wastage = 5.1kg bulk almonds consumed
        const repackageRes = await request(app)
            .post("/api/v1/admin/manufacturing/repackaging")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                sourceRawMaterialId: almondRmId,
                sourceLotId: almondLotId,
                targetProductId: almondProductId,
                targetVariantId: almondVariantId,
                packageUnitsProduced: 20,
                unitSizeQuantity: 250,
                unitSizeUnit: "g",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                wastageQuantity: 0.1,
                notes: "Repackaging bulk almond lot into 250g retail pouches",
            });

        expect(repackageRes.status).toBe(201);
        expect(repackageRes.body.success).toBe(true);
        const data = repackageRes.body.data;
        repackagingRunId = data.id;

        expect(data.runNumber).toMatch(/^RPK-/);
        expect(data.sourceQuantity).toBe(5.1); // 5kg net + 0.1kg scrap
        expect(data.sourceUnit).toBe("kg");
        expect(data.packageUnitsProduced).toBe(20);
        expect(data.sourceLotNumber).toBe("LOT-ALMOND-001");
        expect(data.status).toBe("COMPLETED");

        // Financial validation: 5.1kg * ₹600/kg = ₹3060 total cost. Unit cost = ₹3060 / 20 = ₹153/pack
        expect(data.totalCost).toBe(3060);
        expect(data.unitCost).toBe(153);

        // Verify bulk lot available quantity deducted from 50kg to 44.9kg
        const lot = await RawMaterialLotModel.findById(almondLotId);
        expect(Math.round(lot!.availableQuantity * 100) / 100).toBe(44.9);

        // Verify bulk raw material currentStock is 44.9kg
        const rm = await RawMaterialModel.findById(almondRmId);
        expect(Math.round(rm!.currentStock * 100) / 100).toBe(44.9);

        // Verify RawMaterialStockMovement ledger has REPACKAGING_CONSUMPTION entry
        const rawMovement = await RawMaterialStockMovementModel.findOne({
            rawMaterialId: new Types.ObjectId(almondRmId),
            type: "REPACKAGING_CONSUMPTION",
        });
        expect(rawMovement).not.toBeNull();
        expect(rawMovement!.quantityDelta).toBe(-5.1);
        expect(rawMovement!.referenceType).toBe("REPACKAGING_RUN");

        // Verify finished store inventory credited with 20 units
        const inv = await InventoryModel.findOne({
            productId: new Types.ObjectId(almondProductId),
            variantId: new Types.ObjectId(almondVariantId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(inv).not.toBeNull();
        expect(inv!.onHand).toBe(20);

        // Verify finished stock movement logged with source lot reference
        const stockMov = await StockMovementModel.findOne({
            productId: new Types.ObjectId(almondProductId),
            variantId: new Types.ObjectId(almondVariantId),
            type: "STOCK_RECEIPT",
            referenceId: data.runNumber,
        });
        expect(stockMov).not.toBeNull();
        expect(stockMov!.quantityDelta).toBe(20);
        expect(stockMov!.reason).toContain("LOT-ALMOND-001");
    });

    it("Phase 10: Repackaging Reversal Flow (Restores Bulk Lot & Debits Store Inventory)", async () => {
        const revRes = await request(app)
            .post(`/api/v1/admin/manufacturing/repackaging/${repackagingRunId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reason: "Reversal test: discovered incorrect pouch label printing",
            });

        expect(revRes.status).toBe(200);
        expect(revRes.body.success).toBe(true);
        expect(revRes.body.data.status).toBe("REVERSED");
        expect(revRes.body.data.reversalDetails?.reason).toBe(
            "Reversal test: discovered incorrect pouch label printing"
        );

        // 1. Bulk raw material currentStock restored back to 50kg
        const rm = await RawMaterialModel.findById(almondRmId);
        expect(Math.round(rm!.currentStock * 100) / 100).toBe(50);

        // 2. Source lot restored back to 50kg
        const lot = await RawMaterialLotModel.findById(almondLotId);
        expect(Math.round(lot!.availableQuantity * 100) / 100).toBe(50);
        expect(lot!.isDepleted).toBe(false);

        // 3. Raw stock ledger contains REPACKAGING_REVERSAL contra movement (+5.1kg)
        const rawReversal = await RawMaterialStockMovementModel.findOne({
            rawMaterialId: new Types.ObjectId(almondRmId),
            type: "REPACKAGING_REVERSAL",
        });
        expect(rawReversal).not.toBeNull();
        expect(rawReversal!.quantityDelta).toBe(5.1);

        // 4. Finished store inventory debited back from 20 to 0
        const inv = await InventoryModel.findOne({
            productId: new Types.ObjectId(almondProductId),
            variantId: new Types.ObjectId(almondVariantId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(inv).not.toBeNull();
        expect(inv!.onHand).toBe(0);

        // 5. Finished stock movement logged OUT with DAMAGE_WRITE_OFF (-20)
        const outMov = await StockMovementModel.findOne({
            productId: new Types.ObjectId(almondProductId),
            variantId: new Types.ObjectId(almondVariantId),
            type: "DAMAGE_WRITE_OFF",
        });
        expect(outMov).not.toBeNull();
        expect(outMov!.quantityDelta).toBe(-20);
    });

    // =========================================================================
    // PHASE 11: CONCURRENT PRODUCTION RACE CONDITION GUARD
    // =========================================================================
    it("Phase 11: Concurrent Production Race Condition Guard (Double-Spend & Negative Balances Prevented)", async () => {
        // Setup Besan raw material with strictly 10kg available
        const besanRmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: `RM-CONC-${Date.now()}`,
                name: "Concurrent Test Besan (Gram Flour)",
                category: "GRAIN",
                unit: "kg",
                reorderThreshold: 2,
            });
        expect(besanRmRes.status).toBe(201);
        const besanRmId = besanRmRes.body.data.id;

        // Inward 10kg into a single lot
        const intakeRes = await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: besanRmId,
                lotNumber: `LOT-BESAN-CONC-${Date.now()}`,
                quantity: 10,
                unit: "kg",
                costPerUnit: 80,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Apex Agro Millers",
                    invoiceNumber: "INV-BESAN-CONC-01",
                },
                expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            });
        expect(intakeRes.status).toBe(201);

        // Recipe: 1 unit requires 1 kg Besan
        const concRecipeRes = await request(app)
            .post("/api/v1/admin/manufacturing/recipes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Concurrent Besan Ladoo 1kg",
                code: `REC-BESAN-CONC-${Date.now()}`,
                version: 1,
                productId: testProductId,
                variantId: testVariantId,
                batchYield: { quantity: 1, unit: "pcs" },
                shelfLifeDays: 45,
                ingredients: [
                    {
                        rawMaterialId: besanRmId,
                        quantity: 1,
                        unit: "kg",
                        wastagePercent: 0,
                    },
                ],
            });
        expect(concRecipeRes.status).toBe(201);
        const concRecipeId = concRecipeRes.body.data.id;

        // Worker A requests 8 units (requires 8 kg)
        const reqWorkerA = request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId: concRecipeId,
                plannedQuantity: 8,
                actualQuantity: 8,
                warehouseId: DEFAULT_WAREHOUSE_ID,
                manufacturingDate: new Date().toISOString(),
            });

        // Worker B requests 7 units (requires 7 kg)
        const reqWorkerB = request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId: concRecipeId,
                plannedQuantity: 7,
                actualQuantity: 7,
                warehouseId: DEFAULT_WAREHOUSE_ID,
                manufacturingDate: new Date().toISOString(),
            });

        // Fire both requests concurrently
        const [resA, resB] = await Promise.all([reqWorkerA, reqWorkerB]);

        const statuses = [resA.status, resB.status];
        // Exactly ONE request must succeed (201), and the other must fail with 400 or 409
        expect(statuses).toContain(201);
        const successCount = statuses.filter((s) => s === 201).length;
        expect(successCount).toBe(1);

        const failedRes = resA.status === 201 ? resB : resA;
        const successRes = resA.status === 201 ? resA : resB;
        expect(failedRes.status).not.toBe(201);
        expect([400, 409]).toContain(failedRes.status);

        // Verify that Besan stock NEVER went negative (10 - 8 - 7 != -5 kg)
        const remainingRm = await RawMaterialModel.findById(besanRmId);
        expect(remainingRm).not.toBeNull();
        expect(remainingRm!.currentStock).toBeGreaterThanOrEqual(0);

        const expectedStock = 10 - successRes.body.data.actualQuantity;
        expect(remainingRm!.currentStock).toBe(expectedStock);

        // Verify lot availableQuantity matches exactly
        const besanLot = await RawMaterialLotModel.findOne({ rawMaterialId: new Types.ObjectId(besanRmId) });
        expect(besanLot).not.toBeNull();
        expect(besanLot!.availableQuantity).toBe(expectedStock);
        expect(besanLot!.availableQuantity).toBeGreaterThanOrEqual(0);
    });

    // =========================================================================
    // PHASE 12: REVERSAL GUARD AFTER FINISHED GOODS ARE SOLD & PARTIAL REVERSAL
    // =========================================================================
    it("Phase 12: Reversal Guard when Finished Goods are Sold (Rejects Full, Allows Controlled Partial)", async () => {
        // 1. Create a fresh batch of 100 units
        const bulkRmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: `RM-REV-${Date.now()}`,
                name: "Batch Reversal Test Flour",
                category: "GRAIN",
                unit: "kg",
                reorderThreshold: 5,
            });
        expect(bulkRmRes.status).toBe(201);
        const revRmId = bulkRmRes.body.data.id;

        await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: revRmId,
                lotNumber: `LOT-REV-FLOUR-${Date.now()}`,
                quantity: 100,
                unit: "kg",
                costPerUnit: 50,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Bulk Mills Ltd",
                    invoiceNumber: "INV-REV-FLOUR-01",
                },
                expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
            });

        const revRecipeRes = await request(app)
            .post("/api/v1/admin/manufacturing/recipes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Reversal Test Cookies 100pk",
                code: `REC-REV-${Date.now()}`,
                version: 1,
                productId: testProductId,
                variantId: testVariantId,
                batchYield: { quantity: 1, unit: "pcs" },
                shelfLifeDays: 60,
                ingredients: [
                    {
                        rawMaterialId: revRmId,
                        quantity: 1,
                        unit: "kg",
                        wastagePercent: 0,
                    },
                ],
            });
        const revRecipeId = revRecipeRes.body.data.id;

        // Produce 100 units
        const prodRes = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId: revRecipeId,
                plannedQuantity: 100,
                actualQuantity: 100,
                warehouseId: DEFAULT_WAREHOUSE_ID,
                manufacturingDate: new Date().toISOString(),
            });
        expect(prodRes.status).toBe(201);
        const batchId = prodRes.body.data.id;

        const invBefore = await InventoryModel.findOne({
            productId: new Types.ObjectId(testProductId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(invBefore).not.toBeNull();

        // 2. Simulate 60 units sold or dispatched to customers
        // Set onHand to exactly 40 units remaining from this batch
        invBefore!.onHand = 40;
        await invBefore!.save();

        // 3. Attempt FULL reversal of 100 units -> MUST BE REJECTED
        const fullRevAttempt = await request(app)
            .post(`/api/v1/admin/manufacturing/production-runs/${batchId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reason: "Defect found in batch - attempt full reversal",
            });

        expect(fullRevAttempt.status).toBe(400);
        expect(fullRevAttempt.body.success).toBe(false);
        expect(fullRevAttempt.body.error.message).toContain("Maximum reversible quantity: 40");
        expect(fullRevAttempt.body.error.message).toContain("60 units have already been sold or reserved");

        // 4. Attempt partial reversal of 40 units -> MUST SUCCEED
        const partialRev = await request(app)
            .post(`/api/v1/admin/manufacturing/production-runs/${batchId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reverseQuantity: 40,
                reason: "Recall and scrap remaining 40 unsold units",
            });

        expect(partialRev.status).toBe(200);
        expect(partialRev.body.success).toBe(true);
        expect(partialRev.body.data.status).toBe("PARTIALLY_REVERSED");
        expect(partialRev.body.data.reversalDetails.reversedQuantity).toBe(40);
        expect(partialRev.body.data.reversalDetails.isPartial).toBe(true);
        expect(partialRev.body.data.reversalDetails.soldOrReservedAtReversal).toBe(60);

        // 5. Verify finished goods inventory debited by 40 units (onHand becomes 0)
        const invAfter = await InventoryModel.findById(invBefore!._id);
        expect(invAfter!.onHand).toBe(0);

        // 6. Verify raw material lots restored PROPORTIONALLY (40% of 100kg = 40kg restored)
        const restoredRm = await RawMaterialModel.findById(revRmId);
        expect(restoredRm!.currentStock).toBe(40);

        const restoredLot = await RawMaterialLotModel.findOne({ rawMaterialId: new Types.ObjectId(revRmId) });
        expect(restoredLot!.availableQuantity).toBe(40);
    });

    // =========================================================================
    // PHASE 13: REPACKAGING REVERSAL GUARD WITH SOLD RETAIL PACKS
    // =========================================================================
    it("Phase 13: Repackaging Reversal Guard when Retail Packs Sold (Rejects Full, Allows Partial)", async () => {
        // 1. Create bulk cashew nuts (100 kg)
        const cashewRmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: `RM-CASHEW-${Date.now()}`,
                name: "Premium Whole Cashews Bulk",
                category: "INGREDIENT",
                usage: "BOTH",
                unit: "kg",
                reorderThreshold: 10,
            });
        expect(cashewRmRes.status).toBe(201);
        const cashewRmId = cashewRmRes.body.data.id;

        const cashewLotRes = await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: cashewRmId,
                lotNumber: `LOT-CASHEW-${Date.now()}`,
                quantity: 100,
                unit: "kg",
                costPerUnit: 600,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Goa Cashew Plantations",
                    invoiceNumber: "INV-CASHEW-001",
                },
                expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
            });
        const cashewLotId = cashewLotRes.body.data.lot.id;

        // Retail product for 500g pouch
        const cashewProductRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Premium Whole Cashews 500g Pouch",
                slug: `cashews-500g-pouch-${Date.now()}`,
                categoryId: (await CategoryModel.findOne())!._id.toString(),
                baseCurrency: "INR",
                variants: [
                    {
                        title: "500g Pouch",
                        sku: `SKU-CASHEW-500G-${Date.now()}`,
                        prices: [{ currency: "INR", amount: 450, costAmount: 300 }],
                    },
                ],
            });
        const retailProdId = cashewProductRes.body.data.id;
        const retailVarId = cashewProductRes.body.data.variants[0].id;

        // Repackage 40 packs of 500g (20 kg bulk required)
        const repackRes = await request(app)
            .post("/api/v1/admin/manufacturing/repackaging")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                sourceRawMaterialId: cashewRmId,
                sourceLotId: cashewLotId,
                targetProductId: retailProdId,
                targetVariantId: retailVarId,
                packageUnitsProduced: 40,
                unitSizeQuantity: 500,
                unitSizeUnit: "g",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                notes: "Cashew 500g repackaging batch",
            });
        expect(repackRes.status).toBe(201);
        const rpkRunId = repackRes.body.data.id;

        // Verify bulk stock deducted from 100kg to 80kg
        const lotAfterPack = await RawMaterialLotModel.findById(cashewLotId);
        expect(lotAfterPack!.availableQuantity).toBe(80);

        // 2. Simulate 30 packs sold to retail customers (10 packs remain on hand)
        const inv = await InventoryModel.findOne({
            productId: new Types.ObjectId(retailProdId),
            variantId: new Types.ObjectId(retailVarId),
            warehouseId: new Types.ObjectId(DEFAULT_WAREHOUSE_ID),
        });
        expect(inv).not.toBeNull();
        expect(inv!.onHand).toBe(40);
        inv!.onHand = 10;
        await inv!.save();

        // 3. Attempt FULL reversal of 40 units -> MUST BE REJECTED
        const fullRevFail = await request(app)
            .post(`/api/v1/admin/manufacturing/repackaging/${rpkRunId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reason: "Mislabeling detected - attempt full recall",
            });

        expect(fullRevFail.status).toBe(400);
        expect(fullRevFail.body.success).toBe(false);
        expect(fullRevFail.body.error.message).toContain("Maximum reversible quantity: 10");
        expect(fullRevFail.body.error.message).toContain("30 units have already been sold or reserved");

        // 4. Execute partial reversal of 10 units -> MUST SUCCEED
        const partialRevSuccess = await request(app)
            .post(`/api/v1/admin/manufacturing/repackaging/${rpkRunId}/reverse`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reverseQuantity: 10,
                reason: "Recall and return to bulk for 10 unsold packs",
            });

        expect(partialRevSuccess.status).toBe(200);
        expect(partialRevSuccess.body.success).toBe(true);
        expect(partialRevSuccess.body.data.status).toBe("PARTIALLY_REVERSED");
        expect(partialRevSuccess.body.data.reversalDetails.reversedQuantity).toBe(10);
        expect(partialRevSuccess.body.data.reversalDetails.isPartial).toBe(true);

        // 5. Store inventory onHand becomes 0
        const invFinal = await InventoryModel.findById(inv!._id);
        expect(invFinal!.onHand).toBe(0);

        // 6. Proportional bulk mass restored: 10/40 * 20kg = 5kg restored
        // Bulk lot stock should increase from 80kg to 85kg
        const lotFinal = await RawMaterialLotModel.findById(cashewLotId);
        expect(lotFinal!.availableQuantity).toBe(85);

        const rmFinal = await RawMaterialModel.findById(cashewRmId);
        expect(rmFinal!.currentStock).toBe(85);
    });

    // =========================================================================
    // PHASE 14: WASTAGE VARIANCE ANALYTICS & QA EXPIRY OVERRIDE AUDIT TRAIL
    // =========================================================================
    it("Phase 14: Wastage Variance Tracking & QA Expiry Override Audit Trail", async () => {
        // Create raw material with 100g
        const saffronRmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                code: `RM-SAFFRON-${Date.now()}`,
                name: "Kashmiri Mongra Saffron",
                category: "SPICE",
                unit: "g",
                reorderThreshold: 5,
            });
        expect(saffronRmRes.status).toBe(201);
        const saffronRmId = saffronRmRes.body.data.id;

        await request(app)
            .post("/api/v1/admin/manufacturing/intakes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId: saffronRmId,
                lotNumber: `LOT-SAFFRON-${Date.now()}`,
                quantity: 100,
                unit: "g",
                costPerUnit: 250,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Pampore Saffron Guild",
                    invoiceNumber: "INV-SAFFRON-01",
                },
                expiryDate: new Date(Date.now() + 730 * 86400000).toISOString(),
            });

        // Recipe: 10 units yield, 5% normal loss
        const saffronRecipeRes = await request(app)
            .post("/api/v1/admin/manufacturing/recipes")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Saffron Extract Essence 100ml",
                code: `REC-SAFFRON-${Date.now()}`,
                version: 1,
                productId: testProductId,
                variantId: testVariantId,
                batchYield: { quantity: 10, unit: "pcs" },
                shelfLifeDays: 90,
                ingredients: [
                    {
                        rawMaterialId: saffronRmId,
                        quantity: 10,
                        unit: "g",
                        wastagePercent: 5, // 5% expected loss
                    },
                ],
            });
        const saffronRecipeId = saffronRecipeRes.body.data.id;

        // Custom QA Expiry Date
        const customQAExpiry = new Date(Date.now() + 365 * 86400000).toISOString();

        // Execute production with explicit actual loss variance and QA override
        const runRes = await request(app)
            .post("/api/v1/admin/manufacturing/production-runs")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                recipeId: saffronRecipeId,
                plannedQuantity: 10,
                actualQuantity: 10,
                actualLossQuantity: 1.2, // Actual loss 1.2g vs expected (0.5g)
                wastageCategory: "PRODUCTION_UNPLANNED_LOSS",
                wastageNotes: "Unplanned evaporation loss during heating process",
                customExpiryDate: customQAExpiry,
                qaApprovalNotes: "QA Chief approved extended 12-month expiry based on nitrogen flush packaging",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                manufacturingDate: new Date().toISOString(),
            });

        expect(runRes.status).toBe(201);
        expect(runRes.body.success).toBe(true);

        const data = runRes.body.data;

        // 1. Validate Wastage Report
        expect(data.wastageReport).toBeDefined();
        expect(data.wastageReport.wastageCategory).toBe("PRODUCTION_UNPLANNED_LOSS");
        expect(data.wastageReport.actualLossQuantity).toBe(1.2);
        expect(data.wastageReport.expectedLossQuantity).toBe(0.5); // 10g * 5% = 0.5g
        expect(data.wastageReport.varianceQuantity).toBe(0.7); // 1.2 - 0.5 = 0.7g variance
        expect(data.wastageReport.wastageNotes).toBe("Unplanned evaporation loss during heating process");

        // 2. Validate QA Expiry Determination & Audit Trail
        expect(data.expiryDetermination).toBeDefined();
        expect(data.expiryDetermination.decisionType).toBe("QA_OVERRIDE");
        expect(data.expiryDetermination.recipeShelfLifeDays).toBe(90);
        expect(data.expiryDetermination.qaApprovalNotes).toBe(
            "QA Chief approved extended 12-month expiry based on nitrogen flush packaging"
        );
        expect(new Date(data.expiryDate).toISOString().slice(0, 10)).toBe(
            customQAExpiry.slice(0, 10)
        );
    });

    describe("Vendor Master & Supplier Purchase Ledger", () => {
        let createdVendorId: string;

        it("should create a new vendor with only Name and Phone number", async () => {
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/vendors")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    name: "Mysore Spice Merchants",
                    contactNumber: "+91 99887 76655",
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.name).toBe("Mysore Spice Merchants");
            expect(res.body.data.contactNumber).toBe("+91 99887 76655");
            expect(res.body.data.status).toBe("ACTIVE");
            expect(res.body.data.totalIntakes).toBe(0);
            expect(res.body.data.totalSpend).toBe(0);
            createdVendorId = res.body.data.id;
        });

        it("should reject duplicate vendor name", async () => {
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/vendors")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    name: "mysore spice merchants",
                    contactNumber: "+91 12345 67890",
                });

            expect(res.status).toBe(409);
        });

        it("should list vendors with search filtering", async () => {
            const res = await request(app)
                .get("/api/v1/admin/manufacturing/vendors?search=mysore")
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].name).toBe("Mysore Spice Merchants");
        });

        it("should update vendor profile with GSTIN and address", async () => {
            const res = await request(app)
                .patch(`/api/v1/admin/manufacturing/vendors/${createdVendorId}`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    gstin: "29AAAAA0000A1Z5",
                    address: "Devaraja Market, Mysore",
                    email: "spices@mysoremerchants.com",
                });

            expect(res.status).toBe(200);
            expect(res.body.data.gstin).toBe("29AAAAA0000A1Z5");
            expect(res.body.data.address).toBe("Devaraja Market, Mysore");
            expect(res.body.data.email).toBe("spices@mysoremerchants.com");
        });

        it("should record purchase intake linked to vendorId and increment vendor metrics", async () => {
            const purchaseDate = new Date().toISOString();
            const expiryDate = new Date(Date.now() + 180 * 86400000).toISOString();

            const intakeRes = await request(app)
                .post("/api/v1/admin/manufacturing/purchases")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    rawMaterialId,
                    sourceType: "EXTERNAL_VENDOR",
                    vendorId: createdVendorId,
                    supplier: {
                        name: "Mysore Spice Merchants",
                        contact: "+91 99887 76655",
                        invoiceNumber: "INV-MY-001",
                    },
                    purchaseDate,
                    expiryDate,
                    quantity: 50,
                    unit: "kg",
                    totalCost: 15000,
                    notes: "First bulk intake test from Mysore Spice Merchants",
                });

            expect(intakeRes.status).toBe(201);
            expect(intakeRes.body.data.lot.vendorId).toBe(createdVendorId);

            // Verify Vendor stats updated
            const vendorRes = await request(app)
                .get(`/api/v1/admin/manufacturing/vendors/${createdVendorId}`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(vendorRes.status).toBe(200);
            expect(vendorRes.body.data.totalIntakes).toBe(1);
            expect(vendorRes.body.data.totalSpend).toBe(15000);
            expect(vendorRes.body.data.lastPurchaseDate).toBeDefined();
        });

        it("should fetch vendor purchase history ledger", async () => {
            const res = await request(app)
                .get(`/api/v1/admin/manufacturing/vendors/${createdVendorId}/purchases`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].lotNumber).toBeDefined();
            expect(res.body.data[0].supplier.invoiceNumber).toBe("INV-MY-001");
        });
    });

    describe("Multi-Variety Recipe Scaling & Batch Pricing Sync Tests", () => {
        let multiProdId: string;
        let v500Id: string;
        let v750Id: string;
        let v1kgId: string;
        let baseRecipeId: string;

        beforeAll(async () => {
            // Create a multi-variant product (Jamun 500g, 750g, 1kg)
            const cat = await CategoryModel.findOne({ slug: "sweets-desserts" });
            const prodRes = await request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Gulab Jamun Heritage Collection",
                    slug: "gulab-jamun-heritage-collection",
                    categoryId: cat?._id?.toString(),
                    baseCurrency: "INR",
                    variants: [
                        {
                            sku: "JAMUN-500G",
                            title: "500g Tin",
                            weight: 500,
                            weightUnit: "g",
                            prices: [{ currency: "INR", amount: 200, costAmount: 90 }],
                        },
                        {
                            sku: "JAMUN-750G",
                            title: "750g Tin",
                            weight: 750,
                            weightUnit: "g",
                            prices: [{ currency: "INR", amount: 290, costAmount: 130 }],
                        },
                        {
                            sku: "JAMUN-1KG",
                            title: "1kg Family Pack",
                            weight: 1000,
                            weightUnit: "g",
                            prices: [{ currency: "INR", amount: 380, costAmount: 170 }],
                        },
                    ],
                });

            multiProdId = prodRes.body.data.id;
            v500Id = prodRes.body.data.variants[0].id;
            v750Id = prodRes.body.data.variants[1].id;
            v1kgId = prodRes.body.data.variants[2].id;

            if (!rawMaterialId) {
                const rm = await RawMaterialModel.create({
                    code: "RM-JAMUN-TEST",
                    name: "Mawa / Khoya",
                    category: "DAIRY",
                    usage: "RAW_MATERIAL",
                    unit: "kg",
                    averageCost: 100,
                    lastPurchasePrice: 100,
                    currentStock: 100,
                    reorderThreshold: 5,
                    isActive: true,
                });
                rawMaterialId = rm._id.toString();
            }

            // Formulate base recipe for 500g variety
            const recRes = await request(app)
                .post("/api/v1/admin/manufacturing/recipes")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    code: "RCP-JAMUN-BASE-500G",
                    name: "Gulab Jamun Base Recipe",
                    productId: multiProdId,
                    variantId: v500Id,
                    shelfLifeDays: 45,
                    batchYield: { quantity: 10, unit: "tins" },
                    ingredients: [
                        {
                            rawMaterialId,
                            quantity: 10,
                            unit: "kg",
                            wastagePercent: 5,
                        },
                    ],
                    packagingMaterials: [],
                    laborOverheadCost: 50,
                    instructions: "Boil syrup, fry dough gently.",
                });

            expect(recRes.status).toBe(201);
            baseRecipeId = recRes.body.data.id;
        });

        it("should auto-generate scaled recipes for 750g (1.5x) and 1kg (2.0x) varieties", async () => {
            const res = await request(app)
                .post(`/api/v1/admin/manufacturing/recipes/${baseRecipeId}/auto-generate-variants`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({});

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(2); // 750g and 1kg

            const r750 = res.body.data.find((r: any) => r.variantId === v750Id);
            const r1kg = res.body.data.find((r: any) => r.variantId === v1kgId);

            expect(r750).toBeDefined();
            expect(r1kg).toBeDefined();

            // 750g ratio is 750 / 500 = 1.5x: 10kg base * 1.5 = 15kg
            expect(r750.ingredients[0].quantity).toBe(15);
            // 750g overhead: 50 * 1.5 = 75
            expect(r750.laborOverheadCost).toBe(75);

            // 1kg ratio is 1000 / 500 = 2.0x: 10kg base * 2.0 = 20kg
            expect(r1kg.ingredients[0].quantity).toBe(20);
            // 1kg overhead: 50 * 2.0 = 100
            expect(r1kg.laborOverheadCost).toBe(100);
        });

        it("should support custom scaling ratio overrides during auto-generation", async () => {
            const res = await request(app)
                .post(`/api/v1/admin/manufacturing/recipes/${baseRecipeId}/auto-generate-variants`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    targetVariantIds: [v1kgId],
                    customRatios: {
                        [v1kgId]: 2.2, // Custom override ratio 2.2x instead of 2.0x
                    },
                });

            expect(res.status).toBe(201);
            expect(res.body.data.length).toBe(1);
            const r1kg = res.body.data[0];
            expect(r1kg.ingredients[0].quantity).toBe(22); // 10 * 2.2 = 22kg
            expect(r1kg.laborOverheadCost).toBe(110); // 50 * 2.2 = 110
        });

        it("should auto-generate scaled recipes for all varieties when formulated with 1 kg universal master formula", async () => {
            // Formulate standard 1kg master recipe (no variantId attached, batch yield = 1 kg)
            const masterRecRes = await request(app)
                .post("/api/v1/admin/manufacturing/recipes")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    code: "RCP-JAMUN-1KG-MASTER",
                    name: "Gulab Jamun 1kg Universal Base Recipe",
                    productId: multiProdId,
                    shelfLifeDays: 60,
                    batchYield: { quantity: 1, unit: "kg" },
                    ingredients: [
                        {
                            rawMaterialId,
                            quantity: 1, // 1 kg base formulation
                            unit: "kg",
                            wastagePercent: 4,
                        },
                    ],
                    packagingMaterials: [],
                    laborOverheadCost: 40,
                    instructions: "Universal 1kg base recipe batch preparation.",
                });

            expect(masterRecRes.status).toBe(201);
            const master1kgRecipeId = masterRecRes.body.data.id;

            // Auto-generate variants from 1kg universal master formula
            const autoGenRes = await request(app)
                .post(`/api/v1/admin/manufacturing/recipes/${master1kgRecipeId}/auto-generate-variants`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({});

            expect(autoGenRes.status).toBe(201);
            expect(autoGenRes.body.success).toBe(true);
            // All 3 varieties (500g, 750g, 1000g) should be generated
            expect(autoGenRes.body.data.length).toBe(3);

            const r500 = autoGenRes.body.data.find((r: any) => r.variantId === v500Id);
            const r750 = autoGenRes.body.data.find((r: any) => r.variantId === v750Id);
            const r1kg = autoGenRes.body.data.find((r: any) => r.variantId === v1kgId);

            expect(r500).toBeDefined();
            expect(r750).toBeDefined();
            expect(r1kg).toBeDefined();

            // 500g: ratio 500/1000 = 0.5x -> 1kg * 0.5 = 0.5kg
            expect(r500.ingredients[0].quantity).toBe(0.5);
            expect(r500.laborOverheadCost).toBe(20); // 40 * 0.5

            // 750g: ratio 750/1000 = 0.75x -> 1kg * 0.75 = 0.75kg
            expect(r750.ingredients[0].quantity).toBe(0.75);
            expect(r750.laborOverheadCost).toBe(30); // 40 * 0.75

            // 1kg: ratio 1000/1000 = 1.0x -> 1kg * 1.0 = 1kg
            expect(r1kg.ingredients[0].quantity).toBe(1);
            expect(r1kg.laborOverheadCost).toBe(40); // 40 * 1.0
        });

        it("should batch sync production costs and suggested selling prices across all varieties in catalog", async () => {
            const batchRes = await request(app)
                .post("/api/v1/admin/manufacturing/sync-variant-pricing-batch")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    productId: multiProdId,
                    updates: [
                        { variantId: v500Id, costAmount: 95.5, sellingPrice: 220 },
                        { variantId: v750Id, costAmount: 142.25, sellingPrice: 320 },
                        { variantId: v1kgId, costAmount: 190.0, sellingPrice: 420 },
                    ],
                });

            expect(batchRes.status).toBe(200);
            expect(batchRes.body.success).toBe(true);
            expect(batchRes.body.data.updatedVariants).toBe(3);

            // Fetch the product directly from the database and verify prices & costs
            const updatedProduct = await ProductModel.findById(multiProdId);
            expect(updatedProduct).toBeDefined();

            const p500 = updatedProduct?.variants.find((v: any) => v.id === v500Id);
            const p750 = updatedProduct?.variants.find((v: any) => v.id === v750Id);
            const p1kg = updatedProduct?.variants.find((v: any) => v.id === v1kgId);

            expect(p500?.prices[0]?.costAmount).toBe(95.5);
            expect(p500?.prices[0]?.amount).toBe(220);

            expect(p750?.prices[0]?.costAmount).toBe(142.25);
            expect(p750?.prices[0]?.amount).toBe(320);

            expect(p1kg?.prices[0]?.costAmount).toBe(190.0);
            expect(p1kg?.prices[0]?.amount).toBe(420);
        });
    });
});

