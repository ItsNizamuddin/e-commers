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
                    result.error.flatten().fieldErrors,
                ),
            );

            return;
        }

        if (source === "query") {
            Object.assign(req.query, result.data);
        } else if (source === "params") {
            Object.assign(req.params, result.data);
        } else {
            req.body = result.data;
        }

        next();
    };
};