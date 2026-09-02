import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error.js";

export const validate = (
    schema: ZodType,
    source: "body" | "params" | "query",
): RequestHandler => {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            next(
                new AppError(
                    "Request validation failed",
                    400,
                    "VALIDATION_ERROR",
                    result.error.flatten(),
                ),
            );

            return;
        }

        req[source] = result.data;

        next();
    };
};