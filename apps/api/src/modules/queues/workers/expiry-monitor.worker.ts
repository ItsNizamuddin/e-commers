import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queue.client.js";
import { RawMaterialLotModel } from "../../manufacturing/raw-material-lot.model.js";
import { outboxService } from "../../outbox/outbox.service.js";
import { queueJobService, type TrackableJob } from "../queue-job.service.js";
import { reservationService } from "../../inventory/services/reservation.service.js";
import { logger } from "../../../config/logger.js";

export interface ExpiryScanResult {
    scannedAt: string;
    expiredCount: number;
    warningsCount: {
        within30Days: number;
        within15Days: number;
        within7Days: number;
        within1Day: number;
    };
    expiredLotNumbers: string[];
}

/**
 * Executes a full FEFO lot expiry scan:
 * 1. Automatically transitions expired lots from AVAILABLE -> EXPIRED (stock remains physical, but blocked from allocation).
 * 2. Aggregates upcoming expiry warnings (30d, 15d, 7d, 1d) and registers an Outbox alert for staff.
 */
export async function runExpiryScan(): Promise<ExpiryScanResult> {
    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const day15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const day1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // 1. Transition expired lots (status: AVAILABLE -> EXPIRED)
    const expiredLots = await RawMaterialLotModel.find({
        status: "AVAILABLE",
        expiryDate: { $lte: now },
        availableQuantity: { $gt: 0 },
    });

    const expiredLotNumbers: string[] = [];
    for (const lot of expiredLots) {
        lot.status = "EXPIRED";
        await lot.save();
        expiredLotNumbers.push(lot.lotNumber);
    }

    if (expiredLots.length > 0) {
        logger.warn(
            { expiredCount: expiredLots.length, lotNumbers: expiredLotNumbers },
            "FEFO Expiry Scan: Marked expired lots as status EXPIRED"
        );
    }

    // 2. Aggregate active lots approaching expiry
    const activeLots = await RawMaterialLotModel.find({
        status: "AVAILABLE",
        isDepleted: false,
        availableQuantity: { $gt: 0 },
        expiryDate: { $gt: now, $lte: day30 },
    }).populate("rawMaterialId", "name code");

    let within30Days = 0;
    let within15Days = 0;
    let within7Days = 0;
    let within1Day = 0;

    const warningDetails: Array<{
        lotNumber: string;
        materialName: string;
        availableQuantity: number;
        unit: string;
        expiryDate: string;
        daysRemaining: number;
    }> = [];

    for (const lot of activeLots) {
        const exp = new Date(lot.expiryDate);
        const daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        within30Days++;
        if (exp <= day15) within15Days++;
        if (exp <= day7) within7Days++;
        if (exp <= day1) within1Day++;

        const mat = lot.rawMaterialId as any;
        warningDetails.push({
            lotNumber: lot.lotNumber,
            materialName: mat?.name || "Unknown Material",
            availableQuantity: lot.availableQuantity,
            unit: lot.unit,
            expiryDate: lot.expiryDate.toISOString(),
            daysRemaining,
        });
    }

    const result: ExpiryScanResult = {
        scannedAt: now.toISOString(),
        expiredCount: expiredLots.length,
        warningsCount: {
            within30Days,
            within15Days,
            within7Days,
            within1Day,
        },
        expiredLotNumbers,
    };

    // If warnings or expired lots exist, write an Outbox notification event
    if (expiredLots.length > 0 || within7Days > 0) {
        const todayStr = now.toISOString().slice(0, 10);
        await outboxService.recordEvent({
            eventType: "EXPIRY_WARNING_DIGEST",
            aggregateType: "RawMaterialLot",
            aggregateId: expiredLots[0]?._id || activeLots[0]?._id || (now as any),
            deduplicationKey: `EXPIRY_DIGEST:${todayStr}`,
            payload: {
                ...result,
                topUrgentLots: warningDetails.filter((w) => w.daysRemaining <= 7),
            },
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
