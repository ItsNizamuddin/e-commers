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
import { RawMaterialModel } from "../modules/manufacturing/raw-material.model.js";
import { RawMaterialLotModel } from "../modules/manufacturing/raw-material-lot.model.js";
import { RepackagingRunModel } from "../modules/manufacturing/repackaging-run.model.js";
import { FinishedGoodsLotModel } from "../modules/manufacturing/finished-goods-lot.model.js";
import { OrderModel } from "../modules/orders/models/order.model.js";
import { PaymentModel } from "../modules/payments/models/payment.model.js";
import { DEFAULT_WAREHOUSE_ID } from "../database/schemas/warehouse.schema.js";

describe("Finished Goods Lots, FEFO Allocation & Recall Verification Tests", () => {
    let superAdminToken: string;
    let categoryId: string;
    let productId: string;
    let variantId: string;
    let rawMaterialId: string;
    let bulkLotId: string;
    let finishedLotAId: string;
    let finishedLotBId: string;
    let publicTokenA: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await InventoryModel.deleteMany({});
        await RawMaterialModel.deleteMany({});
        await RawMaterialLotModel.deleteMany({});
        await RepackagingRunModel.deleteMany({});
        await FinishedGoodsLotModel.deleteMany({});
        await OrderModel.deleteMany({});
        await PaymentModel.deleteMany({});

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

        // 2. Create Category & Retail Product
        const categoryRes = await request(app)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Dry Fruits & Nuts",
                slug: `dry-fruits-${Date.now()}`,
                description: "Premium retail nuts",
                isActive: true,
            });
        categoryId = categoryRes.body.data.id;

        const productRes = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                title: "Organic California Almonds Jar",
                slug: `organic-almonds-jar-${Date.now()}`,
                categoryId,
                baseCurrency: "INR",
                variants: [
                    {
                        sku: `ALM-500G-${Date.now()}`,
                        title: "500g Jar",
                        prices: [
                            {
                                currency: "INR",
                                amount: 650,
                                costAmount: 400,
                            },
                        ],
                    },
                ],
            });
        expect(productRes.status).toBe(201);
        productId = productRes.body.data.id;
        variantId = productRes.body.data.variants[0].id;

        // 3. Create Bulk Raw Material & Intake Lot
        const rmRes = await request(app)
            .post("/api/v1/admin/manufacturing/raw-materials")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                name: "Raw Bulk Almonds Grade A",
                code: `RM-ALM-${Date.now()}`,
                category: "INGREDIENT",
                unit: "kg",
                shelfLifeDays: 365,
                reorderPoint: 50,
            });
        expect(rmRes.status).toBe(201);
        rawMaterialId = rmRes.body.data.id;

        const intakeRes = await request(app)
            .post("/api/v1/admin/manufacturing/purchases")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                rawMaterialId,
                sourceType: "EXTERNAL_VENDOR",
                supplier: {
                    name: "Golden Valley Farms",
                    invoiceNumber: "INV-ALM-001",
                },
                quantity: 200,
                unit: "kg",
                totalCost: 80000,
                costPerUnit: 400,
                lotNumber: `LOT-BULK-${Date.now()}`,
                expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            });
        expect(intakeRes.status).toBe(201);
        bulkLotId = intakeRes.body.data.lot.id;
    });

    afterAll(async () => {
        await disconnectDatabase();
    });

    it("1. Packaging Run should automatically create FinishedGoodsLot with opaque public token", async () => {
        const expiryA = new Date(Date.now() + 30 * 86400000); // 30 days expiry
        const packResA = await request(app)
            .post("/api/v1/admin/manufacturing/repackaging")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                sourceRawMaterialId: rawMaterialId,
                sourceLotId: bulkLotId,
                targetProductId: productId,
                targetVariantId: variantId,
                packageUnitsProduced: 50,
                unitSizeQuantity: 500,
                unitSizeUnit: "g",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                expiryDate: expiryA.toISOString(),
            });

        expect(packResA.status).toBe(201);
        const runA = packResA.body.data;
        expect(runA.finishedGoodsLot).toBeDefined();
        expect(runA.finishedGoodsLot.lotNumber).toBeDefined();
        expect(runA.finishedGoodsLot.availableQuantity).toBe(50);
        expect(runA.finishedGoodsLot.publicVerificationToken).toMatch(/^bv_/);

        finishedLotAId = runA.finishedGoodsLot.id;
        publicTokenA = runA.finishedGoodsLot.publicVerificationToken;

        // Verify FinishedGoodsLot in database
        const lotADoc = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotADoc).not.toBeNull();
        expect(lotADoc?.qualityStatus).toBe("AVAILABLE");
        expect(lotADoc?.availableQuantity).toBe(50);
        expect(lotADoc?.allocatedQuantity).toBe(0);
        expect(lotADoc?.consumedQuantity).toBe(0);

        // Create second lot with 60 days expiry
        const expiryB = new Date(Date.now() + 60 * 86400000);
        const packResB = await request(app)
            .post("/api/v1/admin/manufacturing/repackaging")
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                sourceRawMaterialId: rawMaterialId,
                sourceLotId: bulkLotId,
                targetProductId: productId,
                targetVariantId: variantId,
                packageUnitsProduced: 50,
                unitSizeQuantity: 500,
                unitSizeUnit: "g",
                warehouseId: DEFAULT_WAREHOUSE_ID,
                expiryDate: expiryB.toISOString(),
            });

        expect(packResB.status).toBe(201);
        finishedLotBId = packResB.body.data.finishedGoodsLot.id;
    });

    function createMockOrderData(overrides: any = {}) {
        const qty = overrides.quantity || 10;
        const unitPrice = 65000;
        const lineTotal = unitPrice * qty;
        return {
            orderNumber: overrides.orderNumber || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            checkoutId: new Types.ObjectId(),
            paymentId: overrides.paymentId || new Types.ObjectId(),
            customerEmailSnapshot: overrides.customerEmailSnapshot || "test@example.com",
            customerNameSnapshot: overrides.customerNameSnapshot || "Test Customer",
            items: overrides.items || [
                {
                    productId: new Types.ObjectId(productId),
                    variantId: new Types.ObjectId(variantId),
                    sku: "ALM-500G-TEST",
                    productTitle: "Organic California Almonds Jar",
                    variantTitle: "500g Jar",
                    quantity: qty,
                    currency: "INR",
                    unitPriceMinor: unitPrice,
                    lineTotalMinor: lineTotal,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "John",
                lastName: "Doe",
                street: "123 Market Road",
                city: "Mumbai",
                state: "MH",
                postalCode: "400001",
                country: "IN",
            },
            billingAddressSnapshot: {
                firstName: "John",
                lastName: "Doe",
                street: "123 Market Road",
                city: "Mumbai",
                state: "MH",
                postalCode: "400001",
                country: "IN",
            },
            pricing: {
                subtotalMinor: lineTotal,
                shippingMinor: 0,
                taxMinor: 0,
                discountMinor: 0,
                grandTotalMinor: lineTotal,
                currency: "INR",
            },
            orderStatus: overrides.orderStatus || "CONFIRMED",
            paymentStatus: overrides.paymentStatus || "CAPTURED",
            fulfillmentStatus: overrides.fulfillmentStatus || "UNFULFILLED",
            placedAt: new Date(),
            version: overrides.version || 1,
        };
    }

    it("2. Fulfilling order should allocate lots via transactional FEFO (earliest expiry first)", async () => {
        // Create mock payment
        const payment = await PaymentModel.create({
            checkoutId: new Types.ObjectId(),
            provider: "MOCK",
            paymentIntentId: `pi_mock_${Date.now()}_2`,
            amountMinor: 65000 * 20,
            currency: "INR",
            status: "CAPTURED",
            version: 1,
        });

        // Create order for 20 units
        const order = await OrderModel.create(
            createMockOrderData({
                orderNumber: `ORD-${Date.now()}-01`,
                paymentId: payment._id,
                customerEmailSnapshot: "fefo.customer@example.com",
                customerNameSnapshot: "John FEFO",
                quantity: 20,
            })
        );

        // Transition fulfillment from UNFULFILLED to PROCESSING
        const fulfillRes = await request(app)
            .patch(`/api/v1/orders/admin/${order._id}/fulfillment`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                fulfillmentStatus: "PROCESSING",
                expectedVersion: 1,
                fulfillmentWarehouseId: DEFAULT_WAREHOUSE_ID.toString(),
            });

        expect(fulfillRes.status).toBe(200);
        expect(fulfillRes.body.data.fulfillmentStatus).toBe("PROCESSING");
        expect(fulfillRes.body.data.items[0].allocatedLots).toHaveLength(1);

        const allocation = fulfillRes.body.data.items[0].allocatedLots[0];
        expect(allocation.lotId).toBe(finishedLotAId); // Earlier expiry lot A was picked!
        expect(allocation.quantity).toBe(20);

        // Verify Lot A in DB has reserved quantities
        const lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotA?.availableQuantity).toBe(30); // 50 - 20
        expect(lotA?.allocatedQuantity).toBe(20);
        expect(lotA?.consumedQuantity).toBe(0);

        // Verify Lot B was untouched
        const lotB = await FinishedGoodsLotModel.findById(finishedLotBId);
        expect(lotB?.availableQuantity).toBe(50);
        expect(lotB?.allocatedQuantity).toBe(0);
    });

    it("3. Order shipment should finalize lot consumption (allocatedQuantity -> consumedQuantity)", async () => {
        const order = await OrderModel.findOne({ customerEmailSnapshot: "fefo.customer@example.com" });
        expect(order).not.toBeNull();

        // Transition from PROCESSING to SHIPPED
        const shipRes = await request(app)
            .patch(`/api/v1/orders/admin/${order!._id}/fulfillment`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                fulfillmentStatus: "SHIPPED",
                expectedVersion: order!.version,
                carrier: "BlueDart",
                trackingNumber: "BD-123456789",
            });

        expect(shipRes.status).toBe(200);
        expect(shipRes.body.data.fulfillmentStatus).toBe("SHIPPED");

        // Verify Lot A in DB finalized consumption
        const lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotA?.availableQuantity).toBe(30);
        expect(lotA?.allocatedQuantity).toBe(0); // Shifted from allocated to consumed
        expect(lotA?.consumedQuantity).toBe(20);
    });

    it("4. Cancelling an order should release allocated lots back to availableQuantity", async () => {
        const payment = await PaymentModel.create({
            checkoutId: new Types.ObjectId(),
            provider: "MOCK",
            paymentIntentId: `pi_mock_${Date.now()}_4`,
            amountMinor: 65000 * 10,
            currency: "INR",
            status: "CAPTURED",
            version: 1,
        });

        // Create another order for 10 units
        const order = await OrderModel.create(
            createMockOrderData({
                orderNumber: `ORD-${Date.now()}-02`,
                paymentId: payment._id,
                customerEmailSnapshot: "cancel.customer@example.com",
                customerNameSnapshot: "Jane Cancel",
                quantity: 10,
            })
        );

        // Move to PROCESSING to allocate lots
        const procRes = await request(app)
            .patch(`/api/v1/orders/admin/${order._id}/fulfillment`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                fulfillmentStatus: "PROCESSING",
                expectedVersion: 1,
                fulfillmentWarehouseId: DEFAULT_WAREHOUSE_ID.toString(),
            });
        expect(procRes.status).toBe(200);

        // Lot A available was 30; now should be 20, allocated should be 10
        let lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotA?.availableQuantity).toBe(20);
        expect(lotA?.allocatedQuantity).toBe(10);

        // Now Cancel the order
        const cancelRes = await request(app)
            .post(`/api/v1/orders/admin/${order._id}/cancel`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                expectedVersion: procRes.body.data.version || 2,
            });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.orderStatus).toBe("CANCELLED");

        // Verify Lot A available was restored back to 30, allocated reset to 0
        lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotA?.availableQuantity).toBe(30);
        expect(lotA?.allocatedQuantity).toBe(0);
    });

    it("5. Emergency Lot Recall should mark lot RECALLED, release active allocations, and return blast radius", async () => {
        // Create an unfulfilled order allocated to Lot A
        const payment = await PaymentModel.create({
            checkoutId: new Types.ObjectId(),
            provider: "MOCK",
            paymentIntentId: `pi_mock_${Date.now()}_5`,
            amountMinor: 65000 * 5,
            currency: "INR",
            status: "CAPTURED",
            version: 1,
        });

        const activeOrder = await OrderModel.create(
            createMockOrderData({
                orderNumber: `ORD-${Date.now()}-03`,
                paymentId: payment._id,
                customerEmailSnapshot: "active.packer@example.com",
                customerNameSnapshot: "Packer Active",
                fulfillmentStatus: "PROCESSING",
                items: [
                    {
                        productId: new Types.ObjectId(productId),
                        variantId: new Types.ObjectId(variantId),
                        sku: "ALM-500G-TEST",
                        productTitle: "Organic California Almonds Jar",
                        variantTitle: "500g Jar",
                        quantity: 5,
                        currency: "INR",
                        unitPriceMinor: 65000,
                        lineTotalMinor: 65000 * 5,
                        allocatedLots: [
                            {
                                lotId: new Types.ObjectId(finishedLotAId),
                                lotNumber: "LOT-A-TEST",
                                warehouseId: DEFAULT_WAREHOUSE_ID,
                                quantity: 5,
                                allocatedAt: new Date(),
                            },
                        ],
                    },
                ],
            })
        );

        // Trigger Lot Recall
        const recallRes = await request(app)
            .post(`/api/v1/admin/manufacturing/lots/${finishedLotAId}/recall`)
            .set("Authorization", `Bearer ${superAdminToken}`)
            .send({
                reason: "Contaminated jar seals reported from batch",
                quarantineInventory: true,
                notifyCustomers: false,
            });

        expect(recallRes.status).toBe(200);
        const report = recallRes.body.data;
        expect(report.lotNumber).toBeDefined();
        expect(report.impactedOrders).toBeDefined();

        // Categorized blast radius
        expect(report.impactedOrders.shipped.length).toBeGreaterThanOrEqual(1); // Shipped order from test 3
        expect(report.impactedOrders.shipped[0].customerEmail).toBe("fefo.customer@example.com");

        // Active unfulfilled order was automatically unallocated
        const recheckedActiveOrder = await OrderModel.findById(activeOrder._id);
        expect(recheckedActiveOrder?.items?.[0]?.allocatedLots?.length || 0).toBe(0);

        // Verify Lot A qualityStatus in DB is RECALLED
        const lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        expect(lotA?.qualityStatus).toBe("RECALLED");
        expect(lotA?.recalledAt).toBeDefined();
    });

    it("6. Public batch verification endpoint should return verified data with redacted financial information", async () => {
        // Hit public endpoint WITHOUT Authorization header
        const publicRes = await request(app)
            .get(`/api/v1/manufacturing/public/verify/${publicTokenA}`);

        expect(publicRes.status).toBe(200);
        const batch = publicRes.body.data;

        expect(batch.publicToken).toBe(publicTokenA);
        expect(batch.lotNumber).toBeDefined();
        expect(batch.productTitle).toBe("Organic California Almonds Jar");
        expect(batch.verificationStatus).toBe("RECALLED"); // Recalled from previous test
        expect(batch.packedDate).toBeDefined();
        expect(batch.expiryDate).toBeDefined();

        // Crucial security & margin protection check: NO confidential financials exposed
        expect(batch.costPerUnit).toBeUndefined();
        expect(batch.wac).toBeUndefined();
        expect(batch.supplierCost).toBeUndefined();
        expect(batch.marginPercent).toBeUndefined();
        expect(batch.purchasePrice).toBeUndefined();
    });

    it("7. Traceability CSV export endpoint should stream valid CSV data", async () => {
        const lotA = await FinishedGoodsLotModel.findById(finishedLotAId);
        const exportRes = await request(app)
            .get(`/api/v1/admin/manufacturing/traceability/${lotA!.lotNumber}/export`)
            .set("Authorization", `Bearer ${superAdminToken}`);

        expect(exportRes.status).toBe(200);
        expect(exportRes.headers["content-type"]).toContain("text/csv");
        expect(exportRes.text).toContain("Customer Email");
        expect(exportRes.text).toContain("fefo.customer@example.com");
    });
});
