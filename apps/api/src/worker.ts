import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { getQueues, closeQueues } from "./modules/queues/queue.client.js";
import { createNotificationWorker } from "./modules/queues/workers/notification.worker.js";
import { createDocumentWorker } from "./modules/queues/workers/document.worker.js";
import { createBulkProcessingWorker } from "./modules/queues/workers/bulk.worker.js";
import { createExpiryMonitorWorker } from "./modules/queues/workers/expiry-monitor.worker.js";
import { createWalletReconciliationWorker } from "./modules/queues/workers/wallet-reconciliation.worker.js";
import { outboxDispatcher } from "./modules/outbox/outbox.dispatcher.js";
import { logger } from "./config/logger.js";
import { env } from "./config/env.js";

async function startWorker(): Promise<void> {
    try {
        logger.info("Starting standalone BullMQ worker process...");

        await connectDatabase();

        // 1. Initialize BullMQ Workers
        const workers = [
            createNotificationWorker(),
            createDocumentWorker(),
            createBulkProcessingWorker(),
            createExpiryMonitorWorker(),
            createWalletReconciliationWorker(),
        ];

        logger.info("BullMQ queue consumers initialized: notifications(10), documents(2), bulk-processing(2), maintenance(2)");

        // 2. Schedule repeatable maintenance sweeps
        const queues = getQueues();
        await queues.maintenance.upsertJobScheduler(
            "fefo-expiry-scan-scheduler",
            { pattern: "0 1 * * *" },
            { name: "fefo-expiry-scan", data: {} }
        );
        logger.info("Scheduled nightly FEFO lot expiry scan (0 1 * * *)");

        await queues.maintenance.upsertJobScheduler(
            "stale-reservation-sweep-scheduler",
            { pattern: "*/10 * * * *" },
            { name: "sweep-stale-reservations", data: { reason: "Automated sweep of expired inventory reservations" } }
        );
        logger.info("Scheduled recurring inventory reservation expiry sweep (*/10 * * * *)");

        await queues.maintenance.upsertJobScheduler(
            "wallet-reconciliation-scheduler",
            { pattern: "0 * * * *" },
            { name: "wallet-reconciliation", data: {} }
        );
        logger.info("Scheduled hourly wallet ledger reconciliation sweep (0 * * * *)");

        // 3. Start Transactional Outbox Dispatcher loop
        outboxDispatcher.start(1500);

        logger.info("Worker process successfully initialized and listening for jobs.");

        // Graceful Two-Phase Shutdown
        let isShuttingDown = false;
        const shutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            logger.info(`Worker received ${signal}. Stopping outbox dispatcher and completing active jobs...`);

            try {
                outboxDispatcher.stop();
                await Promise.all(workers.map((w) => w.close()));
                await closeQueues();
                await disconnectDatabase();
                logger.info("Worker process shutdown completed gracefully.");
                process.exit(0);
            } catch (err) {
                logger.error(err, "Error during worker shutdown");
                process.exit(1);
            }
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    } catch (err) {
        logger.error(err, "Worker process failed to start");
        process.exit(1);
    }
}

void startWorker();
