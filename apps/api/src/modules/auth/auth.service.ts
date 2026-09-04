import { createHash } from "node:crypto";
import type { UserRole } from "@shopsphere/types";
import { AppError } from "../../utils/app-error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    type SessionType,
} from "../../utils/jwt.js";
import { userRepository } from "../users/user.repository.js";
import { UserModel } from "../users/user.model.js";
import { toUserResponse } from "../users/user.mapper.js";
import { SessionModel } from "./session.model.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

const hashToken = (token: string): string => {
    return createHash("sha256").update(token).digest("hex");
};

export const authService = {
    /**
     * Shared credential verification service for both Customer & Admin login flows.
     */
    async verifyCredentials(email: string, password: string) {
        const user = await userRepository.findByEmail(email);

        if (!user) {
            throw new AppError(
                "Invalid email or password",
                401,
                "INVALID_CREDENTIALS",
            );
        }

        if (!user.isActive) {
            throw new AppError(
                "Your account has been deactivated",
                403,
                "ACCOUNT_DEACTIVATED",
            );
        }

        const isPasswordValid = await verifyPassword(user.passwordHash, password);

        if (!isPasswordValid) {
            throw new AppError(
                "Invalid email or password",
                401,
                "INVALID_CREDENTIALS",
            );
        }

        return user;
    },

    /**
     * Helper to issue access/refresh tokens and persist session in DB.
     */
    async issueTokensAndCreateSession(
        userId: string,
        role: UserRole,
        sessionType: SessionType,
        userAgent = "unknown",
        ipAddress = "unknown",
    ) {
        const accessToken = signAccessToken({
            sub: userId,
            role,
            sessionType,
            type: "access",
        });

        const refreshToken = signRefreshToken({
            sub: userId,
            role,
            sessionType,
            type: "refresh",
        });

        const tokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await SessionModel.create({
            userId,
            tokenHash,
            sessionType,
            expiresAt,
            isRevoked: false,
            userAgent,
            ipAddress,
        });

        return {
            accessToken,
            refreshToken,
        };
    },

    async register(input: RegisterInput) {
        const existingUser = await userRepository.findByEmail(input.email);

        if (existingUser) {
            throw new AppError(
                "An account with this email already exists",
                409,
                "EMAIL_ALREADY_EXISTS",
            );
        }

        const passwordHash = await hashPassword(input.password);

        try {
            return await userRepository.create({
                email: input.email,
                passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
                role: "CUSTOMER",
            });
        } catch (error: unknown) {
            if (
                error &&
                typeof error === "object" &&
                "code" in error &&
                (error as { code?: unknown }).code === 11000
            ) {
                throw new AppError(
                    "An account with this email already exists",
                    409,
                    "EMAIL_ALREADY_EXISTS",
                );
            }

            throw error;
        }
    },

    async loginCustomer(
        input: LoginInput,
        userAgent?: string,
        ipAddress?: string,
    ) {
        const user = await this.verifyCredentials(input.email, input.password);

        if (user.role !== "CUSTOMER") {
            throw new AppError(
                "Staff accounts must log in through the Admin Portal",
                403,
                "FORBIDDEN",
            );
        }

        const tokens = await this.issueTokensAndCreateSession(
            user._id.toString(),
            user.role,
            "CUSTOMER",
            userAgent,
            ipAddress,
        );

        return {
            user: toUserResponse(user),
            tokens,
        };
    },

    async loginAdmin(
        input: LoginInput,
        userAgent?: string,
        ipAddress?: string,
    ) {
        const user = await this.verifyCredentials(input.email, input.password);

        if (user.role === "CUSTOMER") {
            throw new AppError(
                "Access denied. Customer accounts cannot log in through the Admin Portal",
                403,
                "FORBIDDEN",
            );
        }

        const tokens = await this.issueTokensAndCreateSession(
            user._id.toString(),
            user.role,
            "STAFF",
            userAgent,
            ipAddress,
        );

        return {
            user: toUserResponse(user),
            tokens,
        };
    },

    /**
     * Executes Token Rotation & Session Revocation
     */
    async refreshSession(
        refreshTokenString: string | undefined,
        expectedSessionType: SessionType,
        userAgent?: string,
        ipAddress?: string,
    ) {
        if (!refreshTokenString) {
            throw new AppError(
                "Refresh token is required",
                401,
                "UNAUTHENTICATED",
            );
        }

        let payload;
        try {
            payload = verifyRefreshToken(refreshTokenString);
        } catch {
            throw new AppError(
                "Invalid or expired refresh token",
                401,
                "INVALID_REFRESH_TOKEN",
            );
        }

        if (payload.type !== "refresh" || payload.sessionType !== expectedSessionType) {
            throw new AppError(
                "Invalid session type for refresh token endpoint",
                401,
                "INVALID_SESSION_TYPE",
            );
        }

        const tokenHash = hashToken(refreshTokenString);
        const existingSession = await SessionModel.findOne({ tokenHash });

        if (!existingSession || existingSession.isRevoked || existingSession.expiresAt < new Date()) {
            throw new AppError(
                "Session is invalid or has been revoked",
                401,
                "SESSION_REVOKED",
            );
        }

        const user = await UserModel.findById(payload.sub);
        if (!user || !user.isActive) {
            throw new AppError(
                "User account is no longer active",
                401,
                "ACCOUNT_DEACTIVATED",
            );
        }

        // Revoke the old session (Token Rotation)
        existingSession.isRevoked = true;
        await existingSession.save();

        // Issue new tokens & create new session
        const tokens = await this.issueTokensAndCreateSession(
            user._id.toString(),
            user.role,
            expectedSessionType,
            userAgent,
            ipAddress,
        );

        return {
            user: toUserResponse(user),
            tokens,
        };
    },

    async logoutSession(refreshTokenString: string | undefined) {
        if (refreshTokenString) {
            const tokenHash = hashToken(refreshTokenString);
            await SessionModel.updateOne(
                { tokenHash },
                { $set: { isRevoked: true } },
            );
        }
    },
};