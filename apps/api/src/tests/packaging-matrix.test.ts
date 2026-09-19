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
import { RecipeModel } from "../modules/manufacturing/recipe.model.js";
import { PackagingSpecificationModel } from "../modules/manufacturing/packaging-specification.model.js";
import { packagingMatrixService } from "../modules/manufacturing/packaging-matrix.service.js";

describe("Catalog Master & Packaging/Pricing Matrix Hub Tests", () => {
    let superAdminToken: string;
    let testCategoryId: string;
    let testProductId: string;
    let mangoRmId: string;
    let jarRmId: string;
    let lidRmId: string;
    let labelRmId: string;
    let recipeId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RecipeModel.deleteMany({});
        await PackagingSpecificationModel.deleteMany({});

        await seedDefaultSuperAdmin();

        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });

        expect(adminLogin.status).toBe(200);
        superAdminToken = adminLogin.body.data.accessToken;

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
});
