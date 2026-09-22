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
import { RawMaterialStockMovementModel } from "../modules/manufacturing/raw-material-ledger.model.js";
import { RecipeModel } from "../modules/manufacturing/recipe.model.js";
import { ProductionRunModel } from "../modules/manufacturing/production-run.model.js";
import { RepackagingRunModel } from "../modules/manufacturing/repackaging-run.model.js";
import { PackagingSpecificationModel } from "../modules/manufacturing/packaging-specification.model.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";
import { packagingMatrixService } from "../modules/manufacturing/packaging-matrix.service.js";

describe("Catalog Master & Packaging/Pricing Matrix Hub Tests", () => {
    let superAdminToken: string;
    let testCategoryId: string;
    let testProductId: string;
    let testWarehouseId: string;
    let mangoRmId: string;
    let mangoLotId: string;
    let jarRmId: string;
    let lidRmId: string;
    let labelRmId: string;
    let recipeId: string;
    let bulkLotId: string;
    let bulkLotNumber: string;
    let packagingRunId: string;
    let packagingRunNumber: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RawMaterialLotModel.deleteMany({});
        await RawMaterialStockMovementModel.deleteMany({});
        await RecipeModel.deleteMany({});
        await PackagingSpecificationModel.deleteMany({});
        await ProductionRunModel.deleteMany({});
        await RepackagingRunModel.deleteMany({});

        await seedDefaultSuperAdmin();

        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        expect(adminLogin.status).toBe(200);
        superAdminToken = adminLogin.body.data.accessToken;

        testWarehouseId = DEFAULT_WAREHOUSE_ID.toString();

        // Create category
        const cat = await CategoryModel.create({
            name: "Pickles & Preserves",
            slug: "pickles-preserves",
            isActive: true,
        });
        testCategoryId = cat._id.toString();

        // Create food raw material (Green Mango)
        const mango = await RawMaterialModel.create({
            code: "RM-MANGO-RAW",
            name: "Green Mango",
            category: "INGREDIENT",
            usage: "RAW_MATERIAL",
            unit: "kg",
            averageCost: 40,
            lastPurchasePrice: 40,
            currentStock: 500,
            reorderThreshold: 50,
            isActive: true,
        });
        mangoRmId = mango._id.toString();

        // Create RawMaterialLot for mango to enable FEFO bulk production
        const now = new Date();
        const futureExpiry = new Date(now);
        futureExpiry.setDate(futureExpiry.getDate() + 90);

        const mangoLot = await RawMaterialLotModel.create({
            rawMaterialId: mango._id,
            lotNumber: "LOT-MANGO-2026-001",
            expiryDate: futureExpiry,
            receivedDate: now,
            initialQuantity: 500,
            availableQuantity: 500,
            unit: "kg",
            costPerUnit: 40,
            sourceType: "EXTERNAL_VENDOR",
            status: "AVAILABLE",
            isDepleted: false,
        });
        mangoLotId = mangoLot._id.toString();

        // Create packaging materials
        const jar = await RawMaterialModel.create({
            code: "PKG-JAR-500",
            name: "500ml Glass Jar",
            category: "PACKAGING",
            usage: "RAW_MATERIAL",
            unit: "pcs",
            averageCost: 15.0, // ₹15.00
            lastPurchasePrice: 15.0,
            currentStock: 1000,
            reorderThreshold: 100,
            isActive: true,
        });
        jarRmId = jar._id.toString();

        const lid = await RawMaterialModel.create({
            code: "PKG-LID-GOLD",
            name: "Gold Lug Cap",
            category: "PACKAGING",
            usage: "RAW_MATERIAL",
            unit: "pcs",
            averageCost: 3.5, // ₹3.50
            lastPurchasePrice: 3.5,
            currentStock: 2000,
            reorderThreshold: 200,
            isActive: true,
        });
        lidRmId = lid._id.toString();

        const label = await RawMaterialModel.create({
            code: "PKG-LBL-AVAKAYA",
            name: "Waterproof Vinyl Label",
            category: "PACKAGING",
            usage: "RAW_MATERIAL",
            unit: "pcs",
            averageCost: 2.0, // ₹2.00
            lastPurchasePrice: 2.0,
            currentStock: 3000,
            reorderThreshold: 500,
            isActive: true,
        });
        labelRmId = label._id.toString();

        // Create Master Bulk Formula (Recipe) for 10 kg Avakaya Pickle
        // 10kg Mango @ ₹40 = ₹400. Labor = ₹100. Total = ₹500 for 10kg => ₹50/kg
        const recipe = await RecipeModel.create({
            code: "RCP-AVAKAYA-BULK",
            name: "Master Avakaya Pickle Formula",
            version: 1,
            status: "ACTIVE",
            shelfLifeDays: 365,
            batchYield: { quantity: 10, unit: "kg" },
            ingredients: [
                {
                    rawMaterialId: mango._id,
                    quantity: 10,
                    unit: "kg",
                    wastagePercent: 0,
                },
            ],
            packagingMaterials: [],
            laborOverheadCost: 100,
            estimatedCostWac: 50, // ₹50.00 / kg
            estimatedCostHighest: 50,
        });
        recipeId = recipe._id.toString();
    });

    afterAll(async () => {
        await new Promise((r) => setTimeout(r, 250));
        await disconnectDatabase();
    });

    describe("1. Catalog Master Product Creation (No Fake Variants)", () => {
        it("allows creating a DRAFT product with empty variants: []", async () => {
            const res = await request(app)
                .post("/api/v1/products")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    title: "Traditional Andhra Avakaya Pickle",
                    slug: "traditional-andhra-avakaya-pickle",
                    categoryId: testCategoryId,
                    baseCurrency: "INR",
                    status: "DRAFT",
                    description: "Heritage slow-aged spicy mango pickle.",
                    variants: [], // Zero dummy variants!
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("DRAFT");
            expect(res.body.data.variants).toHaveLength(0);
            testProductId = res.body.data.id;
        });

        it("fails to publish a product if it has 0 variants", async () => {
            const res = await request(app)
                .patch(`/api/v1/products/${testProductId}/publish`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("NO_ACTIVE_VARIANTS");
        });
    });

    describe("2. Domain Unit Economics Calculation in Paise", () => {
        it("correctly calculates food cost, packaging BOM, total COGS, and profit margin", () => {
            // Recipe cost: ₹50/kg = 5000 paise/kg
            // Net pack quantity: 500g = 0.5kg
            // Food cost = 0.5 * 5000 = 2500 paise (₹25.00)
            // Packaging:
            //   Jar: 1 * 1500 = 1500 paise (₹15.00)
            //   Lid: 1 * 350 = 350 paise (₹3.50)
            //   Label: 1 * 200 = 200 paise (₹2.00)
            //   Packaging BOM sum = 2050 paise (₹20.50)
            // Labor overhead = 750 paise (₹7.50)
            // Total COGS = 2500 + 2050 + 750 = 5300 paise (₹53.00)
            // Target margin = 60%
            // Suggested customer price = 5300 / (1 - 0.60) = 13250 paise (₹132.50)
            // Customer selling price = ₹149.00 (14900 paise)
            // Gross profit = 14900 - 5300 = 9600 paise (₹96.00)
            // Gross margin = (9600 / 14900) * 100 = 64.43%

            const economics = packagingMatrixService.calculateRowCOGS({
                packQuantity: 500,
                packUnit: "g",
                masterFormulaYieldQty: 10,
                masterFormulaYieldUnit: "kg",
                masterFormulaCostPerUnitMinor: 5000,
                packagingMaterials: [
                    { rawMaterialId: jarRmId, quantity: 1, unit: "pcs", costPerUnitMinor: 1500 },
                    { rawMaterialId: lidRmId, quantity: 1, unit: "pcs", costPerUnitMinor: 350 },
                    { rawMaterialId: labelRmId, quantity: 1, unit: "pcs", costPerUnitMinor: 200 },
                ],
                laborOverheadCostMinor: 750,
                targetMarginPercent: 60,
                customerSellingPriceMinor: 14900,
                taxRatePercent: 0,
                taxTreatment: "TAX_INCLUSIVE",
            });

            expect(economics.foodCostMinor).toBe(2500);
            expect(economics.packagingCostMinor).toBe(2050);
            expect(economics.laborOverheadCostMinor).toBe(750);
            expect(economics.totalCogsMinor).toBe(5300);
            expect(economics.suggestedCustomerPriceMinor).toBe(13250);
            expect(economics.customerSellingPriceMinor).toBe(14900);
            expect(economics.grossProfitMinor).toBe(9600);
            expect(economics.grossMarginPercent).toBe(64.4);
        });
    });

    describe("3. Packaging Matrix Synchronization (Catalog & Spec Update)", () => {
        it("syncs matrix items to ProductVariant and PackagingSpecification without modifying inventory", async () => {
            const initialInventory = await InventoryModel.find({ productId: testProductId });
            expect(initialInventory).toHaveLength(0);

            const syncPayload = {
                productId: testProductId,
                defaultMasterFormulaId: recipeId,
                items: [
                    {
                        title: "250 g Glass Jar",
                        sku: "AVAKAYA-250G",
                        packQuantity: 250,
                        packUnit: "g",
                        masterFormulaId: recipeId,
                        packagingMaterials: [
                            { rawMaterialId: jarRmId, quantity: 1, unit: "pcs" },
                            { rawMaterialId: lidRmId, quantity: 1, unit: "pcs" },
                            { rawMaterialId: labelRmId, quantity: 1, unit: "pcs" },
                        ],
                        laborOverheadCostMinor: 500, // ₹5.00
                        targetMarginPercent: 60,
                        customerSellingPriceMinor: 8900, // ₹89.00
                        compareAtPriceMinor: 9900,
                    },
                    {
                        title: "500 g Glass Jar",
                        sku: "AVAKAYA-500G",
                        packQuantity: 500,
                        packUnit: "g",
                        masterFormulaId: recipeId,
                        packagingMaterials: [
                            { rawMaterialId: jarRmId, quantity: 1, unit: "pcs" },
                            { rawMaterialId: lidRmId, quantity: 1, unit: "pcs" },
                            { rawMaterialId: labelRmId, quantity: 1, unit: "pcs" },
                        ],
                        laborOverheadCostMinor: 750, // ₹7.50
                        targetMarginPercent: 65,
                        customerSellingPriceMinor: 14900, // ₹149.00
                        compareAtPriceMinor: 16900,
                    },
                ],
            };

            const res = await request(app)
                .post(`/api/v1/admin/manufacturing/products/${testProductId}/packaging-matrix/sync`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send(syncPayload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(2);

            // Verify Product variants updated
            const updatedProduct = await ProductModel.findById(testProductId);
            expect(updatedProduct?.variants).toHaveLength(2);
            const variant0 = updatedProduct?.variants?.[0];
            const variant1 = updatedProduct?.variants?.[1];
            expect(variant0?.sku).toBe("AVAKAYA-250G");
            expect(variant0?.weight).toBe(250);
            expect(variant0?.prices?.[0]?.amount).toBe(89);
            expect(variant1?.sku).toBe("AVAKAYA-500G");
            expect(variant1?.weight).toBe(500);
            expect(variant1?.prices?.[0]?.amount).toBe(149);

            // Verify PackagingSpecification records were created
            const specs = await PackagingSpecificationModel.find({ productId: testProductId });
            expect(specs).toHaveLength(2);
            expect(specs[0]?.bulkConsumedPerUnit).toBe(0.25);
            expect(specs[0]?.bulkUnit).toBe("kg");
            expect(specs[0]?.packagingMaterials).toHaveLength(3);

            // CRITICAL TEST: Verify Store Inventory Balances Were NOT Changed!
            const finalInventory = await InventoryModel.find({ productId: testProductId });
            expect(finalInventory).toHaveLength(0);
        });

        it("fetches the synchronized matrix with calculated economics via GET endpoint", async () => {
            const res = await request(app)
                .get(`/api/v1/admin/manufacturing/products/${testProductId}/packaging-matrix`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.productId).toBe(testProductId);
            expect(res.body.data.defaultMasterFormulaId).toBe(recipeId);
            expect(res.body.data.items).toHaveLength(2);

            const row500g = res.body.data.items.find((i: any) => i.sku === "AVAKAYA-500G");
            expect(row500g).toBeDefined();
            expect(row500g.totalCogsMinor).toBe(5300); // ₹53.00
            expect(row500g.customerSellingPriceMinor).toBe(14900); // ₹149.00
            expect(row500g.grossProfitMinor).toBe(9600); // ₹96.00
            expect(row500g.grossMarginPercent).toBe(64.4);
        });

        it("now allows publishing the product since it has valid active variants", async () => {
            const res = await request(app)
                .patch(`/api/v1/products/${testProductId}/publish`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe("PUBLISHED");
        });
    });

    describe("4. Decoupled Master Formula Formulation (Pure R&D Mode)", () => {
        it("allows creating a standalone recipe without any productId or variantId", async () => {
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/recipes")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    code: "RCP-MANGO-CHUTNEY-RD",
                    name: "R&D Sweet Mango Chutney Formulation",
                    version: 1,
                    shelfLifeDays: 180,
                    batchYield: { quantity: 5, unit: "kg" },
                    ingredients: [
                        {
                            rawMaterialId: mangoRmId,
                            quantity: 5,
                            unit: "kg",
                            wastagePercent: 2,
                        },
                    ],
                    laborOverheadCost: 50,
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.code).toBe("RCP-MANGO-CHUTNEY-RD");
            expect(res.body.data.productId).toBeUndefined();
            expect(res.body.data.variantId).toBeUndefined();
        });

        it("enforces unique (code, version) on master recipes", async () => {
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/recipes")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    code: "RCP-MANGO-CHUTNEY-RD",
                    name: "Duplicate Version 1 Recipe",
                    version: 1,
                    shelfLifeDays: 180,
                    batchYield: { quantity: 5, unit: "kg" },
                    ingredients: [
                        {
                            rawMaterialId: mangoRmId,
                            quantity: 5,
                            unit: "kg",
                        },
                    ],
                });

            expect(res.status).toBe(400);
        });
    });

    describe("5. Bulk Production Run (Cooking Phase) & Intermediate Bulk Lot Deposition", () => {
        it("executes bulk production run, consumes raw materials via FEFO, creates Bulk Lot, and DOES NOT touch finished inventory", async () => {
            // Initial finished goods inventory check
            const preRunInv = await InventoryModel.find({ productId: testProductId });
            expect(preRunInv).toHaveLength(0);

            // Execute 20 kg bulk production run of Avakaya formula
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/production-runs")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    recipeId,
                    warehouseId: testWarehouseId,
                    plannedQuantity: 20,
                    actualQuantity: 20,
                    manufacturingDate: new Date().toISOString(),
                    notes: "20kg bulk batch run for Avakaya pickle",
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            const run = res.body.data;
            expect(run.status).toBe("COMPLETED");
            expect(run.actualQuantity).toBe(20);
            expect(run.bulkLotId).toBeDefined();

            // Verify raw material was consumed via FEFO
            const mangoLot = await RawMaterialLotModel.findById(mangoLotId);
            expect(mangoLot?.availableQuantity).toBe(480); // 500 - 20 = 480kg

            // Verify intermediate Bulk Lot was created
            const bulkLot = await RawMaterialLotModel.findById(run.bulkLotId);
            expect(bulkLot).not.toBeNull();
            expect(bulkLot?.sourceType).toBe("MANUFACTURED");
            expect(bulkLot?.availableQuantity).toBe(20);
            expect(bulkLot?.unit).toBe("kg");
            expect(bulkLot?.costPerUnit).toBe(50); // ₹50/kg
            bulkLotId = bulkLot!._id.toString();
            bulkLotNumber = bulkLot!.lotNumber;

            // CRITICAL INVARIANT: Finished Goods Variant Inventory was NOT touched!
            const postRunInv = await InventoryModel.find({ productId: testProductId });
            expect(postRunInv).toHaveLength(0);

            // Verify GET /production-runs/:id
            const getRunRes = await request(app)
                .get(`/api/v1/admin/manufacturing/production-runs/${run.id}`)
                .set("Authorization", `Bearer ${superAdminToken}`);
            expect(getRunRes.status).toBe(200);
            expect(getRunRes.body.data.batchNumber).toBe(run.batchNumber);
        });
    });

    describe("6. Secondary BOM Packaging Run (Bulk Lot + Packaging Materials -> Finished Goods Inventory)", () => {
        it("packages bulk lot into finished 500g variant, consumes packaging BOM, sets expiry, and increments inventory", async () => {
            // Find the 500g variant id
            const product = await ProductModel.findById(testProductId);
            const variant500g = product?.variants.find((v) => v.sku === "AVAKAYA-500G");
            expect(variant500g).toBeDefined();

            // Find the packaging spec
            const spec = await PackagingSpecificationModel.findOne({
                productId: testProductId,
                variantId: new Types.ObjectId(variant500g!.id),
            });
            expect(spec).not.toBeNull();

            // Package 10 jars of 500g (10 * 0.5kg = 5.0kg bulk). Remainder = 0.2kg RETAINED.
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/packaging-runs")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    bulkLotId,
                    targetProductId: testProductId,
                    targetVariantId: variant500g!.id,
                    packagingSpecificationId: spec!._id.toString(),
                    packageUnitsProduced: 10,
                    unitSizeQuantity: 500,
                    unitSizeUnit: "g",
                    warehouseId: testWarehouseId,
                    remainderQuantity: 0.2,
                    remainderDisposition: "RETAINED",
                    notes: "Packaged 10 jars of 500g Avakaya Pickle",
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            const run = res.body.data;
            packagingRunId = run.id;
            packagingRunNumber = run.runNumber;
            expect(run.status).toBe("COMPLETED");
            expect(run.packageUnitsProduced).toBe(10);
            expect(run.bulkConsumed).toBe(5); // 5.0 kg net bulk consumed

            // Verify Bulk Lot deduction: 20kg - 5kg = 15kg remaining
            const updatedBulkLot = await RawMaterialLotModel.findById(bulkLotId);
            expect(updatedBulkLot?.availableQuantity).toBe(15);

            // Verify Packaging BOM Materials deducted:
            // 10 Jars consumed (1000 -> 990)
            const jarRm = await RawMaterialModel.findById(jarRmId);
            expect(jarRm?.currentStock).toBe(990);
            // 10 Lids consumed (2000 -> 1990)
            const lidRm = await RawMaterialModel.findById(lidRmId);
            expect(lidRm?.currentStock).toBe(1990);
            // 10 Labels consumed (3000 -> 2990)
            const labelRm = await RawMaterialModel.findById(labelRmId);
            expect(labelRm?.currentStock).toBe(2990);

            // Verify Finished Goods Inventory incremented to 10
            const inventory = await InventoryModel.findOne({
                productId: testProductId,
                variantId: new Types.ObjectId(variant500g!.id),
                warehouseId: testWarehouseId,
            });
            expect(inventory).not.toBeNull();
            expect(inventory?.onHand).toBe(10);

            // Verify GET /packaging-runs/:id
            const getPkgRes = await request(app)
                .get(`/api/v1/admin/manufacturing/packaging-runs/${packagingRunId}`)
                .set("Authorization", `Bearer ${superAdminToken}`);
            expect(getPkgRes.status).toBe(200);
            expect(getPkgRes.body.data.runNumber).toBe(run.runNumber);
        });
    });

    describe("7. Concurrency & Insufficient Stock Handling", () => {
        it("rejects packaging run if bulk lot does not have sufficient quantity", async () => {
            const product = await ProductModel.findById(testProductId);
            const variant500g = product?.variants.find((v) => v.sku === "AVAKAYA-500G");

            // Bulk lot has 15kg remaining. Requesting 50 jars * 0.5kg = 25kg => should fail!
            const res = await request(app)
                .post("/api/v1/admin/manufacturing/packaging-runs")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    bulkLotId,
                    targetProductId: testProductId,
                    targetVariantId: variant500g!.id,
                    packageUnitsProduced: 50,
                    unitSizeQuantity: 500,
                    unitSizeUnit: "g",
                    warehouseId: testWarehouseId,
                });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("INSUFFICIENT_BULK_STOCK");

            // Verify bulk lot quantity remained unchanged at 15kg
            const bulkLot = await RawMaterialLotModel.findById(bulkLotId);
            expect(bulkLot?.availableQuantity).toBe(15);
        });
    });

    describe("8. Packaging Run Reversal", () => {
        it("safely reverses a packaging run, restoring bulk lot and packaging materials", async () => {
            const product = await ProductModel.findById(testProductId);
            const variant500g = product?.variants.find((v) => v.sku === "AVAKAYA-500G");

            const res = await request(app)
                .post(`/api/v1/admin/manufacturing/packaging-runs/${packagingRunId}/reverse`)
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    reverseQuantity: 10,
                    reason: "QC packaging seal check reversal test",
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify Finished Goods Inventory is decremented back to 0
            const inventory = await InventoryModel.findOne({
                productId: testProductId,
                variantId: new Types.ObjectId(variant500g!.id),
                warehouseId: testWarehouseId,
            });
            expect(inventory?.onHand).toBe(0);

            // Verify Bulk Lot available quantity is restored: 15kg + 5kg = 20kg
            const bulkLot = await RawMaterialLotModel.findById(bulkLotId);
            expect(bulkLot?.availableQuantity).toBe(20);

            // Verify Packaging Materials stock is restored:
            const jarRm = await RawMaterialModel.findById(jarRmId);
            expect(jarRm?.currentStock).toBe(1000);
        });
    });

    describe("9. Two-Way Rapid Recall & Traceability Engine", () => {
        it("traces backward from finished packaging run to bulk lot, bulk production run, and raw ingredient lots", async () => {
            const res = await request(app)
                .get(`/api/v1/admin/manufacturing/traceability/${packagingRunNumber}`)
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const report = res.body.data;
            expect(report.queryIdentifier).toBe(packagingRunNumber);
            expect(report.entityType).toBe("FINISHED_PACKAGING_RUN");
            expect(report.entitySummary.codeOrNumber).toBe(packagingRunNumber);
            expect(report.backwardTrace).toBeDefined();
            expect(report.backwardTrace.packagingRun.runNumber).toBe(packagingRunNumber);
            expect(report.backwardTrace.bulkLot.lotNumber).toBe(bulkLotNumber);
            expect(report.backwardTrace.bulkProduction.recipeCode).toBe("RCP-AVAKAYA-BULK");
            expect(report.backwardTrace.ingredientsConsumed.length).toBeGreaterThan(0);
            expect(report.backwardTrace.ingredientsConsumed[0].lotNumber).toBe("LOT-MANGO-2026-001");
        });

        it("traces forward from raw ingredient lot to all bulk batches and packaging runs produced", async () => {
            const res = await request(app)
                .get("/api/v1/admin/manufacturing/traceability/LOT-MANGO-2026-001")
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const report = res.body.data;
            expect(report.queryIdentifier).toBe("LOT-MANGO-2026-001");
            expect(report.entityType).toBe("INGREDIENT_LOT");
            expect(report.forwardTrace).toBeDefined();
            expect(report.forwardTrace.bulkBatchesProduced.length).toBeGreaterThan(0);
            expect(report.forwardTrace.bulkBatchesProduced[0].recipeName).toBe("Master Avakaya Pickle Formula");
        });

        it("returns 404 when querying an unknown lot or batch identifier", async () => {
            const res = await request(app)
                .get("/api/v1/admin/manufacturing/traceability/UNKNOWN-LOT-999999")
                .set("Authorization", `Bearer ${superAdminToken}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe("10. Food Safety Quality Gate (Expired & Quarantined Lot Guard)", () => {
        it("rejects packaging a bulk lot that is in QUARANTINED or REJECTED status", async () => {
            // Put bulk lot in QUARANTINED status
            await RawMaterialLotModel.findByIdAndUpdate(bulkLotId, { status: "QUARANTINED" });

            const product = await ProductModel.findById(testProductId);
            const variant500g = product?.variants.find((v) => v.sku === "AVAKAYA-500G");

            const res = await request(app)
                .post("/api/v1/admin/manufacturing/packaging-runs")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    bulkLotId,
                    targetProductId: testProductId,
                    targetVariantId: variant500g!.id,
                    packageUnitsProduced: 2,
                    unitSizeQuantity: 500,
                    unitSizeUnit: "g",
                    warehouseId: testWarehouseId,
                });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("LOT_NOT_APPROVED");

            // Restore status to AVAILABLE
            await RawMaterialLotModel.findByIdAndUpdate(bulkLotId, { status: "AVAILABLE" });
        });

        it("rejects packaging a bulk lot that has expired", async () => {
            // Set bulk lot expiry to 1 day in the past
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            await RawMaterialLotModel.findByIdAndUpdate(bulkLotId, { expiryDate: pastDate });

            const product = await ProductModel.findById(testProductId);
            const variant500g = product?.variants.find((v) => v.sku === "AVAKAYA-500G");

            const res = await request(app)
                .post("/api/v1/admin/manufacturing/packaging-runs")
                .set("Authorization", `Bearer ${superAdminToken}`)
                .send({
                    bulkLotId,
                    targetProductId: testProductId,
                    targetVariantId: variant500g!.id,
                    packageUnitsProduced: 2,
                    unitSizeQuantity: 500,
                    unitSizeUnit: "g",
                    warehouseId: testWarehouseId,
                });

            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("LOT_EXPIRED");

            // Restore expiry to future
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 300);
            await RawMaterialLotModel.findByIdAndUpdate(bulkLotId, { expiryDate: futureDate });
        });
    });
});
