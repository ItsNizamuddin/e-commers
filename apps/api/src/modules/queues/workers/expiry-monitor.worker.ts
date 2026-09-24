import { Types } from "mongoose";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queue.client.js";
import { RawMaterialLotModel } from "../../manufacturing/raw-material-lot.model.js";
import { FinishedGoodsLotModel } from "../../manufacturing/finished-goods-lot.model.js";
import { RawMaterialModel } from "../../manufacturing/raw-material.model.js";
import { InventoryModel } from "../../inventory/models/inventory.model.js";
import { outboxService } from "../../outbox/outbox.service.js";
import { queueJobService } from "../queue-job.service.js";
import { reservationService } from "../../inventory/services/reservation.service.js";
import { logger } from "../../../config/logger.js";
import type { ExpiryAlertUrgency } from "@ecommers/types";

export interface ExpiryScanResult {
    scannedAt: string;
    expiredCount: number;
    rawLotsExpired: number;
    finishedLotsExpired: number;
    warningsCount: {
        within30Days: number;
        within15Days: number;
        within7Days: number;
        within1Day: number;
    };
    expiredLotNumbers: string[];
}

export interface LowStockScanResult {
    scannedAt: string;
    rawMaterialsLowCount: number;
    finishedGoodsLowCount: number;
    lowStockItems: Array<{
        id: string;
        type: "RAW_MATERIAL" | "FINISHED_PRODUCT";
        name: string;
        currentStock: number;
        reorderThreshold: number;
    }>;
}

/**
 * Executes a full FEFO lot expiry scan across BOTH Raw Material lots and Finished Goods lots:
 * 1. Automatically transitions expired lots to EXPIRED status in DB.
 * 2. Aggregates upcoming expiry warnings (30d, 15d, 7d, 1d) and registers idempotent Outbox alerts.
 */
export async function runExpiryScan(): Promise<ExpiryScanResult> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const day15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const day1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const expiredLotNumbers: string[] = [];

    // 1. Transition expired Raw Material lots (status: AVAILABLE -> EXPIRED)
    const expiredRawLots = await RawMaterialLotModel.find({
        status: "AVAILABLE",
        expiryDate: { $lte: now },
        availableQuantity: { $gt: 0 },
    });

    for (const lot of expiredRawLots) {
        lot.status = "EXPIRED";
        await lot.save();
        expiredLotNumbers.push(lot.lotNumber);

        // Idempotent Outbox event for newly expired lot
        await outboxService.recordEvent({
            eventType: "LOT_EXPIRED_ALERT",
            aggregateType: "RawMaterialLot",
            aggregateId: lot._id,
            deduplicationKey: `expiry:${lot._id.toString()}:EXPIRED:${todayStr}`,
            payload: {
                lotId: lot._id.toString(),
                lotNumber: lot.lotNumber,
                lotType: "RAW_MATERIAL",
                expiredAt: now.toISOString(),
            },
        });
    }

    // 2. Transition expired Finished Goods lots (qualityStatus: AVAILABLE -> EXPIRED)
    const expiredFinishedLots = await FinishedGoodsLotModel.find({
        qualityStatus: "AVAILABLE",
        expiryDate: { $lte: now },
        availableQuantity: { $gt: 0 },
    });

    for (const lot of expiredFinishedLots) {
        lot.qualityStatus = "EXPIRED";
        await lot.save();
        expiredLotNumbers.push(lot.lotNumber);

        // Idempotent Outbox event for newly expired finished lot
        await outboxService.recordEvent({
            eventType: "LOT_EXPIRED_ALERT",
            aggregateType: "FinishedGoodsLot",
            aggregateId: lot._id,
            deduplicationKey: `expiry:${lot._id.toString()}:EXPIRED:${todayStr}`,
            payload: {
                lotId: lot._id.toString(),
                lotNumber: lot.lotNumber,
                lotType: "FINISHED_GOODS",
                expiredAt: now.toISOString(),
            },
        });
    }

    if (expiredLotNumbers.length > 0) {
        logger.warn(
            {
                expiredCount: expiredLotNumbers.length,
                rawCount: expiredRawLots.length,
                finishedCount: expiredFinishedLots.length,
                lotNumbers: expiredLotNumbers,
            },
            "FEFO Expiry Scan: Marked expired lots as status EXPIRED"
        );
    }

    // 3. Aggregate active Raw Material lots approaching expiry
    const activeRawLots = await RawMaterialLotModel.find({
        status: "AVAILABLE",
        isDepleted: false,
        availableQuantity: { $gt: 0 },
        expiryDate: { $gt: now, $lte: day30 },
    }).populate("rawMaterialId", "name code");

    // 4. Aggregate active Finished Goods lots approaching expiry
    const activeFinishedLots = await FinishedGoodsLotModel.find({
        qualityStatus: "AVAILABLE",
        availableQuantity: { $gt: 0 },
        expiryDate: { $gt: now, $lte: day30 },
    }).populate("productId", "title");

    let within30Days = 0;
    let within15Days = 0;
    let within7Days = 0;
    let within1Day = 0;

    const warningDetails: Array<{
        lotId: string;
        lotNumber: string;
        lotType: "RAW_MATERIAL" | "FINISHED_GOODS";
        name: string;
        availableQuantity: number;
        expiryDate: string;
        daysRemaining: number;
        urgency: ExpiryAlertUrgency;
    }> = [];

    // Process raw material lots
    for (const lot of activeRawLots) {
        const exp = new Date(lot.expiryDate);
        const daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        within30Days++;
        if (exp <= day15) within15Days++;
        if (exp <= day7) within7Days++;
        if (exp <= day1) within1Day++;

        let urgency: ExpiryAlertUrgency = "ADVISORY";
        if (daysRemaining <= 7) urgency = "CRITICAL";
        else if (daysRemaining <= 15) urgency = "WARNING";

        const mat = lot.rawMaterialId as any;
        warningDetails.push({
            lotId: lot._id.toString(),
            lotNumber: lot.lotNumber,
            lotType: "RAW_MATERIAL",
            name: mat?.name || "Raw Material",
            availableQuantity: lot.availableQuantity,
            expiryDate: lot.expiryDate.toISOString(),
            daysRemaining,
            urgency,
        });

        // Register individual idempotent warning event if critical (<= 7 days)
        if (daysRemaining <= 7) {
            await outboxService.recordEvent({
                eventType: "LOT_EXPIRING_URGENT",
                aggregateType: "RawMaterialLot",
                aggregateId: lot._id,
                deduplicationKey: `expiry:${lot._id.toString()}:${urgency}:${todayStr}`,
                payload: {
                    lotId: lot._id.toString(),
                    lotNumber: lot.lotNumber,
                    daysRemaining,
                    urgency,
                },
            });
        }
    }

    // Process finished goods lots
    for (const lot of activeFinishedLots) {
        const exp = new Date(lot.expiryDate);
        const daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        within30Days++;
        if (exp <= day15) within15Days++;
        if (exp <= day7) within7Days++;
        if (exp <= day1) within1Day++;

        let urgency: ExpiryAlertUrgency = "ADVISORY";
        if (daysRemaining <= 7) urgency = "CRITICAL";
        else if (daysRemaining <= 15) urgency = "WARNING";

        const prod = lot.productId as any;
        warningDetails.push({
            lotId: lot._id.toString(),
            lotNumber: lot.lotNumber,
            lotType: "FINISHED_GOODS",
            name: prod?.title || "Finished Product",
            availableQuantity: lot.availableQuantity,
            expiryDate: lot.expiryDate.toISOString(),
            daysRemaining,
            urgency,
        });

        if (daysRemaining <= 7) {
            await outboxService.recordEvent({
                eventType: "LOT_EXPIRING_URGENT",
                aggregateType: "FinishedGoodsLot",
                aggregateId: lot._id,
                deduplicationKey: `expiry:${lot._id.toString()}:${urgency}:${todayStr}`,
                payload: {
                    lotId: lot._id.toString(),
                    lotNumber: lot.lotNumber,
                    daysRemaining,
                    urgency,
                },
            });
        }
    }

    const result: ExpiryScanResult = {
        scannedAt: now.toISOString(),
        expiredCount: expiredLotNumbers.length,
        rawLotsExpired: expiredRawLots.length,
        finishedLotsExpired: expiredFinishedLots.length,
        warningsCount: {
            within30Days,
            within15Days,
            within7Days,
            within1Day,
        },
        expiredLotNumbers,
    };

    // If warnings or expired lots exist, write an aggregated Outbox digest event
    if (expiredLotNumbers.length > 0 || within7Days > 0) {
        await outboxService.recordEvent({
            eventType: "EXPIRY_WARNING_DIGEST",
            aggregateType: "RawMaterialLot",
            aggregateId:
                expiredRawLots[0]?._id ||
                expiredFinishedLots[0]?._id ||
                activeRawLots[0]?._id ||
                activeFinishedLots[0]?._id ||
                new Types.ObjectId(),
            deduplicationKey: `EXPIRY_DIGEST:${todayStr}`,
            payload: {
                ...result,
                topUrgentLots: warningDetails.filter((w) => w.daysRemaining <= 7),
            },
        });
    }

    return result;
}

/**
 * Executes a low-stock scan computing SELLABLE STOCK:
 * sellableStock = onHand - reserved - quarantined - recalled - expired
 * Checks against reorderThreshold with idempotent Outbox events.
 */
export async function runLowStockScan(): Promise<LowStockScanResult> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lowStockItems: LowStockScanResult["lowStockItems"] = [];

    // 1. Raw Materials low stock check
    const rawMaterials = await RawMaterialModel.find({ isActive: true });
    let rawMaterialsLowCount = 0;

    for (const rm of rawMaterials) {
        if (rm.currentStock <= rm.reorderThreshold) {
            rawMaterialsLowCount++;
            lowStockItems.push({
                id: rm._id.toString(),
                type: "RAW_MATERIAL",
                name: rm.name,
                currentStock: rm.currentStock,
                reorderThreshold: rm.reorderThreshold,
            });

            await outboxService.recordEvent({
                eventType: "RAW_MATERIAL_LOW_STOCK",
                aggregateType: "RawMaterial",
                aggregateId: rm._id,
                deduplicationKey: `low-stock:rm:${rm._id.toString()}:${todayStr}`,
                payload: {
                    rawMaterialId: rm._id.toString(),
                    code: rm.code,
                    name: rm.name,
                    currentStock: rm.currentStock,
                    reorderThreshold: rm.reorderThreshold,
                },
            });
        }
    }

    // 2. Retail Inventory sellable stock check
    const inventoryDocs = await InventoryModel.find({}).populate("productId", "title");
    let finishedGoodsLowCount = 0;

    for (const inv of inventoryDocs) {
        // Calculate non-sellable finished goods lots (quarantined, recalled, expired)
        const unSellableLots = await FinishedGoodsLotModel.find({
            variantId: inv.variantId,
            warehouseId: inv.warehouseId,
            $or: [
                { qualityStatus: { $in: ["QUARANTINED", "REJECTED", "RECALLED", "EXPIRED"] } },
                { expiryDate: { $lte: now } },
            ],
        });

        const unSellableQty = unSellableLots.reduce((sum, l) => sum + l.availableQuantity, 0);
        const sellableStock = Math.max(0, inv.onHand - inv.reserved - unSellableQty);

        if (sellableStock <= inv.reorderThreshold) {
            finishedGoodsLowCount++;
            const prod = inv.productId as any;
            lowStockItems.push({
                id: inv._id.toString(),
                type: "FINISHED_PRODUCT",
                name: prod?.title || `Variant ${inv.variantId}`,
                currentStock: sellableStock,
                reorderThreshold: inv.reorderThreshold,
            });

            await outboxService.recordEvent({
                eventType: "INVENTORY_LOW_STOCK",
                aggregateType: "Inventory",
                aggregateId: inv._id,
                deduplicationKey: `low-stock:inv:${inv._id.toString()}:${todayStr}`,
                payload: {
                    inventoryId: inv._id.toString(),
                    variantId: inv.variantId.toString(),
                    warehouseId: inv.warehouseId.toString(),
                    onHand: inv.onHand,
                    reserved: inv.reserved,
                    sellableStock,
                    reorderThreshold: inv.reorderThreshold,
                },
            });
        }
    }

    const result: LowStockScanResult = {
        scannedAt: now.toISOString(),
        rawMaterialsLowCount,
        finishedGoodsLowCount,
        lowStockItems,
    };

    if (lowStockItems.length > 0) {
        await outboxService.recordEvent({
            eventType: "LOW_STOCK_DIGEST",
            aggregateType: "Inventory",
            aggregateId: inventoryDocs[0]?._id || rawMaterials[0]?._id || (now as any),
            deduplicationKey: `LOW_STOCK_DIGEST:${todayStr}`,
            payload: result,
        });
    }

    return result;
}

export function createExpiryMonitorWorker(): Worker {
    const connection = getRedisConnection();

    const worker = new Worker(
        "maintenance",
        async (job: Job) => {
            return queueJobService.executeWithTracking(job, async () => {
                logger.info({ jobId: job.id, jobName: job.name }, "Starting maintenance job");

                if (job.name === "fefo-expiry-scan") {
                    const scanResult = await runExpiryScan();
                    logger.info(
                        {
                            jobId: job.id,
                            expiredCount: scanResult.expiredCount,
                            warnings: scanResult.warningsCount,
                        },
                        "FEFO lot expiry scan completed successfully"
                    );
                    return scanResult;
                }

                if (job.name === "low-stock-scan") {
                    const lowStockResult = await runLowStockScan();
                    logger.info(
                        {
                            jobId: job.id,
                            rawLow: lowStockResult.rawMaterialsLowCount,
                            finishedLow: lowStockResult.finishedGoodsLowCount,
                        },
                        "Low-stock inventory scan completed successfully"
                    );
                    return lowStockResult;
                }

                if (job.name === "sweep-stale-reservations") {
                    const expiredCount = await reservationService.expireStaleReservations(100);
                    logger.info(
                        { jobId: job.id, expiredCount },
                        "Stale reservation sweep completed"
                    );
                    return { expiredCount, sweptAt: new Date().toISOString() };
                }

                logger.warn({ jobName: job.name }, "Unknown maintenance job name received");
                return { status: "SKIPPED", jobName: job.name };
            });
        },
        {
            connection,
            concurrency: 1, // Single-threaded scheduled maintenance
        }
    );

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, err: err.message }, "Maintenance job failed");
    });

    return worker;
}
