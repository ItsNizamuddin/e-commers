import type { Request, Response } from "express";
import { AuditActions } from "@ecommers/types";

import { env } from "../../config/env.js";
import { toUserResponse } from "../users/user.mapper.js";
import { authService } from "./auth.service.js";
import { auditLogService } from "../audit/audit-log.service.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: (env.nodeEnv === "production" ? "strict" : "lax") as "strict" | "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = req.body as RegisterInput;

    const user = await authService.register(input);

    res.status(201).json({
        success: true,
        data: toUserResponse(user),
    });
};

export const loginCustomer = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = req.body as LoginInput;
    const userAgent = req.get("user-agent");
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.loginCustomer(input, userAgent, ip);

    res.cookie("customerRefreshToken", result.tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        path: "/api/v1/auth",
    });

    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
        },
    });
};

export const loginAdmin = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = req.body as LoginInput;
    const userAgent = req.get("user-agent");
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.loginAdmin(input, userAgent, ip);

    // Record immutable audit log entry
    void auditLogService.record({
        action: AuditActions.AUTH_LOGIN_SUCCESS,
        actor: {
            id: result.user.id,
            name: `${result.user.firstName} ${result.user.lastName}`.trim(),
            email: result.user.email,
            role: result.user.role,
        },
        target: {
            resource: "auth",
            resourceId: result.user.id,
            details: {
                email: result.user.email,
                role: result.user.role,
            },
        },
        ipAddress: typeof ip === "string" ? ip : undefined,
        userAgent,
        status: "SUCCESS",
    });

    res.cookie("staffRefreshToken", result.tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        path: "/api/v1/auth/admin",
    });

    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
        },
    });
};

export const refreshCustomer = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const refreshTokenString = req.cookies.customerRefreshToken as string | undefined;
    const userAgent = req.get("user-agent");
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.refreshSession(
        refreshTokenString,
        "CUSTOMER",
        userAgent,
        ip,
    );

    res.cookie("customerRefreshToken", result.tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        path: "/api/v1/auth",
    });

    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
        },
    });
};

export const refreshAdmin = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const refreshTokenString = req.cookies.staffRefreshToken as string | undefined;
    const userAgent = req.get("user-agent");
    const ip = req.ip || req.socket.remoteAddress;

    const result = await authService.refreshSession(
        refreshTokenString,
        "STAFF",
        userAgent,
        ip,
    );

    res.cookie("staffRefreshToken", result.tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        path: "/api/v1/auth/admin",
    });

    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
        },
    });
};

export const logoutCustomer = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const refreshTokenString = req.cookies.customerRefreshToken as string | undefined;

    await authService.logoutSession(refreshTokenString);

    res.clearCookie("customerRefreshToken", {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "strict",
        path: "/api/v1/auth",
    });

    res.status(200).json({
        success: true,
        data: {
            message: "Customer logged out successfully",
        },
    });
};

export const logoutAdmin = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const refreshTokenString = req.cookies.staffRefreshToken as string | undefined;

    await authService.logoutSession(refreshTokenString);

    res.clearCookie("staffRefreshToken", {
        httpOnly: true,
        secure: env.nodeEnv === "production",
        sameSite: "strict",
        path: "/api/v1/auth/admin",
    });

    res.status(200).json({
        success: true,
        data: {
            message: "Staff logged out successfully",
        },
    });
};

// Aliases
export const login = loginCustomer;
export const logout = logoutCustomer;