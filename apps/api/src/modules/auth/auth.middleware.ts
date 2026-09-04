import type { RequestHandler } from "express";
import { type UserRole, ALL_ROLES } from "@shopsphere/types";
import { AppError } from "../../utils/app-error.js";
import { verifyAccessToken } from "../../utils/jwt.js";

export type AuthenticatedUser = {
    id: string;
    role: UserRole;
};

export const requireAuth: RequestHandler = (
    req,
    _res,
    next,
) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        next(
            new AppError(
                "Authentication required",
                401,
                "AUTHENTICATION_REQUIRED",
            ),
        );
        return;
    }

    const token = authorization.slice("Bearer ".length);

    try {
        const payload = verifyAccessToken(token);

        if (
            payload.type !== "access" ||
            typeof payload.sub !== "string" ||
            !ALL_ROLES.includes(payload.role)
        ) {
            throw new Error("Invalid access token payload");
        }

        req.user = {
            id: payload.sub,
            role: payload.role,
        };

        next();
    } catch {
        next(
            new AppError(
                "Invalid or expired access token",
                401,
                "INVALID_ACCESS_TOKEN",
            ),
        );
    }
};

export const authenticate = requireAuth;

export const optionalAuth: RequestHandler = (req, _res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
        return next();
    }

    const token = authorization.slice("Bearer ".length);

    try {
        const payload = verifyAccessToken(token);

        if (
            payload.type === "access" &&
            typeof payload.sub === "string" &&
            ALL_ROLES.includes(payload.role)
        ) {
            req.user = {
                id: payload.sub,
                role: payload.role,
            };
        }
    } catch {
        // Proceed unauthenticated if token verification fails in optionalAuth
    }

    next();
};