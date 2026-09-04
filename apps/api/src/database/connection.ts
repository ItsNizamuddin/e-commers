import mongoose from "mongoose";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export const connectDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    try {
        mongoose.connection.on("error", (error) => {
            logger.error(error, "MongoDB connection error");
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected");
        });

        await mongoose.connect(env.databaseUrl);

        logger.info("MongoDB connection established");
    } catch (error) {
        logger.error(error, "MongoDB connection failed");
        throw error;
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState === 0) {
        return;
    }

    await mongoose.disconnect();

    logger.info("MongoDB connection closed");
};