import { createHash } from "node:crypto";
import { Types } from "mongoose";
import type { UserRole } from "@ecommers/types";
import { AppError } from "../../utils/app-error.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    type SessionType,
} from "../../utils/jwt.js";
import { userRepository } from "../users/user.repository.js";
import { UserModel, type UserDocument } from "../users/user.model.js";
import { toUserResponse } from "../users/user.mapper.js";
import { SessionModel } from "./session.model.js";
import { AuthIdentityModel } from "./auth-identity.model.js";
import { googleAuthService } from "./google-auth.service.js";
import { walletService } from "../wallet/wallet.service.js";
import { withTransaction } from "../../database/transaction.js";
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

        if (!user.passwordLoginEnabled || !user.passwordHash) {
            throw new AppError(
                "Password login is not enabled for this account. Please sign in with Google.",
                401,
                "PASSWORD_LOGIN_DISABLED",
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

        const userObjectId = new Types.ObjectId(userId);

        // 1. Revoke previous active sessions from the same device / client (same userAgent)
        await SessionModel.updateMany(
            {
                userId: userObjectId,
                sessionType,
                userAgent,
                isRevoked: false,
            },
            { $set: { isRevoked: true } }
        );

        // 2. Enforce maximum active sessions cap (max 5 active sessions per user)
        const activeSessions = await SessionModel.find({
            userId: userObjectId,
            sessionType,
            isRevoked: false,
        }).sort({ createdAt: 1 });

        const MAX_ACTIVE_SESSIONS = 5;
        if (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
            const overflowCount = activeSessions.length - MAX_ACTIVE_SESSIONS + 1;
            const oldestToRevoke = activeSessions.slice(0, overflowCount);
            const idsToRevoke = oldestToRevoke.map((s) => s._id);

            await SessionModel.updateMany(
                { _id: { $in: idsToRevoke } },
                { $set: { isRevoked: true } }
            );
        }

        await SessionModel.create({
            userId: userObjectId,
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
            const user = await userRepository.create({
                email: input.email,
                passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
                role: "CUSTOMER",
            });

            // Automatically provision Customer Wallet with location-based currency and welcome bonus
            await walletService.provisionCustomerWallet(user._id.toString(), {
                ...(input.countryCode ? { countryCode: input.countryCode } : {}),
                ...(input.currency ? { currency: input.currency } : {}),
            });

            return user;
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

    /**
     * Authenticates a user with a verified Google ID Token & nonce.
     * Maps Google sub to AuthIdentity, enforces anti-hijacking rules,
     * and auto-provisions a Customer Wallet inside a transaction.
     */
    async loginWithGoogle(
        idToken: string,
        nonce: string,
        userAgent = "unknown",
        ipAddress = "unknown"
    ) {
        const payload = await googleAuthService.verifyIdToken(idToken, nonce);

        // 1. Check if an AuthIdentity exists for this Google subject
        const existingIdentity = await AuthIdentityModel.findOne({
            provider: "GOOGLE",
            providerSubject: payload.sub,
        });

        let user: UserDocument | null = null;

        if (existingIdentity) {
            user = await UserModel.findById(existingIdentity.userId);
            if (!user) {
                throw new AppError("Associated user account not found", 404, "USER_NOT_FOUND");
            }
            if (!user.isActive) {
                throw new AppError("Your account has been deactivated", 403, "ACCOUNT_DEACTIVATED");
            }
        } else {
            // 2. No AuthIdentity: check if an existing user has this email
            const emailUser = await UserModel.findOne({ email: payload.email });
            if (emailUser) {
                // Anti-hijacking policy: Do not auto-link without authenticated credentials
                throw new AppError(
                    "An account with this email already exists. Please log in with your password to link your Google account.",
                    409,
                    "REQUIRE_ACCOUNT_LINKING"
                );
            }

            // 3. Create fresh customer account + AuthIdentity + auto-provision Wallet in a transaction
            user = await withTransaction(async (session) => {
                const newUser = new UserModel({
                    email: payload.email,
                    firstName: payload.firstName,
                    lastName: payload.lastName || "Customer",
                    role: "CUSTOMER",
                    isActive: true,
                    passwordLoginEnabled: false,
                    authenticationMethods: ["GOOGLE"],
                });
                await newUser.save({ session });

                const identity = new AuthIdentityModel({
                    userId: newUser._id,
                    provider: "GOOGLE",
                    providerSubject: payload.sub,
                    email: payload.email,
                    emailVerified: payload.emailVerified,
                    metadata: {
                        name: `${payload.firstName} ${payload.lastName}`.trim(),
                        avatarUrl: payload.picture ?? null,
                    },
                });
                await identity.save({ session });

                // Auto-provision Customer Wallet with location-based currency and welcome bonus
                await walletService.provisionCustomerWallet(newUser._id.toString(), undefined, session);

                return newUser;
            });
        }

        if (!user) {
            throw new AppError("Failed to authenticate user", 500, "AUTH_FAILED");
        }

        const tokens = await this.issueTokensAndCreateSession(
            user._id.toString(),
            user.role as UserRole,
            "CUSTOMER",
            userAgent,
            ipAddress
        );

        return {
            user: toUserResponse(user),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    },

    /**
     * Links a Google identity to an existing authenticated user session.
     */
    async linkGoogleAccount(
        userId: string,
        idToken: string,
        nonce: string
    ) {
        const payload = await googleAuthService.verifyIdToken(idToken, nonce);

        const existingIdentity = await AuthIdentityModel.findOne({
            provider: "GOOGLE",
            providerSubject: payload.sub,
        });

        if (existingIdentity) {
            if (existingIdentity.userId.toString() === userId) {
                return { success: true, message: "Google account is already linked" };
            }
            throw new AppError(
                "This Google account is already linked to another user",
                409,
                "GOOGLE_ALREADY_LINKED"
            );
        }

        const identity = new AuthIdentityModel({
            userId: new Types.ObjectId(userId),
            provider: "GOOGLE",
            providerSubject: payload.sub,
            email: payload.email,
            emailVerified: payload.emailVerified,
            metadata: {
                name: `${payload.firstName} ${payload.lastName}`.trim(),
                avatarUrl: payload.picture ?? null,
            },
        });
        await identity.save();

        await UserModel.findByIdAndUpdate(userId, {
            $addToSet: { authenticationMethods: "GOOGLE" },
        });

        return { success: true, message: "Google account successfully linked" };
    },
};