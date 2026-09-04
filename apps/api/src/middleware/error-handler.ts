import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    req,
    res,
    _next,
) => {
    const requestId = req.id;

    // 1. Domain Operational Errors (AppError)
    if (error instanceof AppError) {
        if (error.statusCode >= 500) {
            logger.error({ requestId, code: error.code, details: error.details }, error.message);
        } else {
            logger.warn({ requestId, code: error.code, details: error.details }, error.message);
        }

        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                ...(error.details !== undefined && { details: error.details }),
            },
        });

        return;
    }

    // 2. Zod Schema Validation Errors
    if (error instanceof ZodError) {
        logger.warn({ requestId, errors: error.flatten().fieldErrors }, "Validation Error");

        res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request payload or parameters",
                details: error.flatten().fieldErrors,
            },
        });

        return;
    }

    // 3. Mongoose Invalid ObjectId Cast Error
    if (error instanceof mongoose.Error.CastError) {
        logger.warn({ requestId, path: error.path }, `Invalid ID format for '${error.path}'`);

        res.status(400).json({
            success: false,
            error: {
                code: "INVALID_ID",
                message: `Invalid ID format provided for '${error.path}'`,
            },
        });

        return;
    }

    // 4. Mongoose Duplicate Key Error (Code 11000)
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: unknown }).code === 11000
    ) {
        logger.warn({ requestId }, "Duplicate key resource error");

        res.status(409).json({
            success: false,
            error: {
                code: "DUPLICATE_RESOURCE",
                message: "A resource with that unique key already exists",
            },
        });

        return;
    }

    // 5. Express JSON Body Syntax Errors (Malformed Body)
    if (error instanceof SyntaxError && "status" in error && error.status === 400 && "body" in error) {
        logger.warn({ requestId }, "Malformed JSON payload provided");

        res.status(400).json({
            success: false,
            error: {
                code: "INVALID_JSON",
                message: "Malformed JSON payload provided in request body",
            },
        });

        return;
    }

    // 6. Unexpected Server Errors (500)
    logger.error({ requestId, err: error }, "Unhandled Server Error");

    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred",
            ...(env.nodeEnv === "development" && {
                stack: error instanceof Error ? error.stack : String(error),
            }),
        },
    });
};
