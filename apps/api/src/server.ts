import type { Server } from "http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./database/connection.js";

let server: Server;

const startServer = async (): Promise<void> => {
    try {
        await connectDatabase();

        server = app.listen(env.port, () => {
            logger.info(
                `API server running on port ${env.port} in ${env.nodeEnv} mode`,
            );
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