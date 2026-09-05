import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { CartIdentity } from "../types/cart.types.js";

declare global {
    namespace Express {
        interface Request {
            cartIdentity?: CartIdentity;
        }
    }
}

export const CART_SESSION_COOKIE_NAME = "cart_session_id";
export const CART_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Resolves or creates a secure cart identity for the current request.
 * Authenticated users are bound to their req.user.id.
 * Guest users are bound to a cryptographically secure HttpOnly cookie.
 */
export function resolveCartIdentity(req: Request, res: Response): CartIdentity {
    // 1. Authenticated User Check
    if (req.user && req.user.id) {
        const identity: CartIdentity = {
            type: "AUTHENTICATED",
            userId: req.user.id,
        };
        req.cartIdentity = identity;
        return identity;
    }

    // 2. Existing Guest Session Check (via cookie or fallback header)
    const existingSessionId =
        req.cookies?.[CART_SESSION_COOKIE_NAME] ||
        (typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : undefined);

    if (existingSessionId && typeof existingSessionId === "string" && existingSessionId.trim().length > 0) {
        const identity: CartIdentity = {
            type: "GUEST",
            sessionId: existingSessionId.trim(),
        };
        req.cartIdentity = identity;
        return identity;
    }

    // 3. New Guest Session Creation
    const newSessionId = crypto.randomBytes(32).toString("hex");

    res.cookie(CART_SESSION_COOKIE_NAME, newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: CART_SESSION_TTL_MS,
        path: "/",
    });

    const identity: CartIdentity = {
        type: "GUEST",
        sessionId: newSessionId,
    };
    req.cartIdentity = identity;
    return identity;
}

/**
 * Express middleware that automatically populates req.cartIdentity.
 */
export function cartIdentityMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        resolveCartIdentity(req, res);
        next();
    } catch (err) {
        next(err);
    }
}
