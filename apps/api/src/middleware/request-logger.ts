import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

/**
 * Production-ready HTTP request logger middleware.
 * Assigns a unique X-Request-ID, logs structured metadata for observability,
 * and maintains clean single-line logs in development.
 */
export const requestLogger: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const startTime = process.hrtime.bigint();

    // 1. Generate or adopt X-Request-ID correlation header
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.id = requestId;
    res.setHeader("X-Request-ID", requestId);

    // 2. Track completion
    res.on("finish", () => {
        // Skip noisy browser CORS preflight requests in development
        if (req.method === "OPTIONS" && env.nodeEnv === "development") {
            return;
        }

        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1e6;
        const message = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${responseTimeMs.toFixed(2)}ms`;

        // In production, always log full structured JSON for log aggregators (Datadog/CloudWatch)
        if (env.nodeEnv !== "development") {
            const logContext = {
                requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                status: res.statusCode,
                responseTimeMs: Number(responseTimeMs.toFixed(2)),
                ip: req.ip || req.socket.remoteAddress,
                userAgent: req.get("user-agent") || "unknown",
            };

            if (res.statusCode >= 500) {
                logger.error(logContext, message);
            } else if (res.statusCode >= 400) {
                logger.warn(logContext, message);
            } else {
                logger.info(logContext, message);
            }
            return;
        }

        // In development: clean, readable terminal logs
        if (res.statusCode >= 500) {
            logger.error({ requestId, ip: req.ip }, message);
        } else if (res.statusCode >= 400) {
            logger.warn({ requestId }, message);
        } else {
            logger.info(message);
        }
    });

    next();
};
