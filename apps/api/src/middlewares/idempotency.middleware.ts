import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { IdempotencyRecordModel } from "../modules/idempotency/idempotency.model.js";
import { logger } from "../config/logger.js";

/**
 * Deterministically serialize any JSON payload with sorted object keys
 * to guarantee identical hash for structurally identical requests.
 */
function canonicalizeJson(obj: any): string {
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return "[" + obj.map(canonicalizeJson).join(",") + "]";
    }
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map((k) => `"${k}":${canonicalizeJson(obj[k])}`);
    return "{" + pairs.join(",") + "}";
}

export function computeRequestHash(method: string, path: string, body: any): string {
    const raw = `${method.toUpperCase()}:${path}:${canonicalizeJson(body || {})}`;
    return createHash("sha256").update(raw).digest("hex");
}

export interface IdempotencyOptions {
    ttlHours?: number;
    required?: boolean;
}

/**
 * Production-grade Idempotency Middleware.
 * Scoped by userId or guest identifier with tamper protection and atomic state transitions.
 */
export function idempotency(options: IdempotencyOptions = {}) {
    const ttlHours = options.ttlHours || 24;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const idempotencyKey = (
            req.headers["idempotency-key"] || req.headers["x-idempotency-key"]
        )?.toString()?.trim();

        if (!idempotencyKey) {
            if (options.required) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: "IDEMPOTENCY_KEY_REQUIRED",
                        message: "This endpoint requires an 'Idempotency-Key' header.",
                    },
                });
                return;
            }
            return next();
        }

        // Scope key to the current authenticated user, guest session, or IP
        const scope = (
            (req as any).user?.id ||
            req.headers["x-checkout-session-id"] ||
            req.ip ||
            "anonymous"
        ).toString();

        const method = req.method.toUpperCase();
        const path = req.originalUrl || req.path;
        const requestHash = computeRequestHash(method, path, req.body);

        try {
            const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

            // Attempt atomic reservation of idempotency key
            await IdempotencyRecordModel.create({
                key: idempotencyKey,
                scope,
                path,
                method,
                requestHash,
                status: "PENDING",
                expiresAt,
            });
        } catch (err: any) {
            // E11000: Compound index collision on { scope, key }
            if (err.code === 11000) {
                const existing = await IdempotencyRecordModel.findOne({
                    scope,
                    key: idempotencyKey,
                });

                if (existing) {
                    // 1. Tamper check: same key used with different payload
                    if (existing.requestHash !== requestHash) {
                        res.status(409).json({
                            success: false,
                            error: {
                                code: "IDEMPOTENCY_KEY_REUSED",
                                message:
                                    "Idempotency key has already been used for a request with different parameters.",
                            },
                        });
                        return;
                    }

                    // 2. Concurrent in-progress execution check
                    if (existing.status === "PENDING") {
                        res.setHeader("Retry-After", "2");
                        res.status(409).json({
                            success: false,
                            error: {
                                code: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
                                message:
                                    "A request with this idempotency key is currently being processed. Please retry shortly.",
                            },
                        });
                        return;
                    }

                    // 3. Completed request replay
                    if (existing.status === "COMPLETED") {
                        res.setHeader("X-Idempotent-Replay", "true");
                        res.status(existing.responseStatus || 200).json(existing.responseBody);
                        return;
                    }

                    // 4. If previous attempt failed (status === 'FAILED'), allow retry by updating to PENDING
                    if (existing.status === "FAILED") {
                        await IdempotencyRecordModel.updateOne(
                            { scope, key: idempotencyKey },
                            {
                                $set: {
                                    status: "PENDING",
                                    requestHash,
                                    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
                                },
                            }
                        );
                    }
                }
            } else {
                logger.error(err, "Idempotency reservation error");
                return next(err);
            }
        }

        // Intercept response to store completed or failed result
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        let responseSaved = false;

        const recordCompletion = async (body: any, isJson: boolean) => {
            if (responseSaved) return;
            responseSaved = true;

            const statusCode = res.statusCode || 200;
            const status = statusCode < 500 ? "COMPLETED" : "FAILED";

            try {
                await IdempotencyRecordModel.updateOne(
                    { scope, key: idempotencyKey },
                    {
                        $set: {
                            status,
                            responseStatus: statusCode,
                            responseBody: isJson ? body : undefined,
                            completedAt: new Date(),
                        },
                    }
                );
            } catch (saveErr) {
                logger.error(saveErr, "Failed to persist idempotency completion");
            }
        };

        res.json = (body: any): Response => {
            void recordCompletion(body, true);
            return originalJson(body);
        };

        res.send = (body: any): Response => {
            void recordCompletion(body, false);
            return originalSend(body);
        };

        next();
    };
}
