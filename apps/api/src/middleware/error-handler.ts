import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
) => {
    // 1. Domain Operational Errors (AppError)
    if (error instanceof AppError) {
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

    // 2. Handle Express JSON Body Syntax Errors (Malformed Body)
    if (error instanceof SyntaxError && "status" in error && error.status === 400 && "body" in error) {
        res.status(400).json({
            success: false,
            error: {
                code: "INVALID_JSON",
                message: "Malformed JSON payload provided in request body",
            },
        });

        return;
    }

    // 3. Unexpected Server Errors (500)
    console.error("Unhandled Error:", error);

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
