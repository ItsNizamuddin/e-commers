import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // 1000 requests per 15 minutes per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: {
        success: false,
        error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests from this IP, please try again later.",
        },
    },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 30, // 30 login/register attempts per 15 minutes per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: {
        success: false,
        error: {
            code: "TOO_MANY_AUTH_ATTEMPTS",
            message: "Too many authentication attempts from this IP, please try again later.",
        },
    },
});
