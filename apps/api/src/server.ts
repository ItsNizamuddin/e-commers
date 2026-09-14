import type { Server } from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";
import { seedDefaultSuperAdmin } from "./database/seed.js";

let server: Server;

let devWorkers: Array<{ close: () => Promise<void> }> = [];

const startServer = async (): Promise<void> => {
    try {
        await connectDatabase();
        await seedDefaultSuperAdmin();

        server = app.listen(env.port, async () => {
            logger.info(
                `API server running on port ${env.port} in ${env.nodeEnv} mode`,
            );

            // Auto-start queue workers in development mode so Bull Board has active consumers out of the box
            if (env.enableQueues && env.nodeEnv === "development") {
                try {
                    const { createNotificationWorker } = await import("./modules/queues/workers/notification.worker.js");
                    const { createDocumentWorker } = await import("./modules/queues/workers/document.worker.js");
                    const { createBulkProcessingWorker } = await import("./modules/queues/workers/bulk.worker.js");
                    const { createExpiryMonitorWorker } = await import("./modules/queues/workers/expiry-monitor.worker.js");
                    const { outboxDispatcher } = await import("./modules/outbox/outbox.dispatcher.js");

                    devWorkers = [
                        createNotificationWorker(),
                        createDocumentWorker(),
                        createBulkProcessingWorker(),
                        createExpiryMonitorWorker(),
                    ];
                    outboxDispatcher.start(2000);
                    logger.info("BullMQ dev workers and Outbox Dispatcher auto-initialized in development mode");
                } catch (e: any) {
                    logger.warn({ err: e.message }, "BullMQ dev workers not initialized in development");
                }
            }
        });
    } catch (error) {
        logger.error(error, "Failed to start server due to database connection error");
        process.exit(1);
    }
};

const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    if (server) {
        server.close(async () => {
            logger.info("HTTP server closed.");
            try {
                if (devWorkers.length > 0) {
                    await Promise.all(devWorkers.map((w) => w.close().catch(() => {})));
                }
                await disconnectDatabase();
            } catch (error) {
                logger.error(error, "Error disconnecting from database");
            } finally {
                process.exit(0);
            }
        });
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

void startServer();