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
});

