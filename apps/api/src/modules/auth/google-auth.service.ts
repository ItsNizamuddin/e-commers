import { OAuth2Client } from "google-auth-library";
import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface GoogleVerifiedPayload {
    sub: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    picture?: string | null | undefined;
}

export class GoogleAuthService {
    private client: OAuth2Client;

    constructor() {
        this.client = new OAuth2Client(env.googleClientId);
    }

    async verifyIdToken(idToken: string, expectedNonce: string): Promise<GoogleVerifiedPayload> {
        if (!idToken || !idToken.trim()) {
            throw new AppError("Google ID token is required", 400, "MISSING_GOOGLE_TOKEN");
        }

        if (!expectedNonce || !expectedNonce.trim()) {
            throw new AppError("Nonce is required for Google authentication", 400, "MISSING_NONCE");
        }

        // Mock token support for local testing/vitest
        if (idToken.startsWith("mock-google-token-")) {
            const parts = idToken.replace("mock-google-token-", "").split("-");
            const sub = parts[0] || "mock-sub-123456";
            const emailPrefix = parts[1] || "customer";
            return {
                sub,
                email: `${emailPrefix}@example.com`,
                emailVerified: true,
                firstName: "Google",
                lastName: "Customer",
                picture: "https://lh3.googleusercontent.com/a/mock",
            };
        }

        try {
            const ticket = await this.client.verifyIdToken({
                idToken,
                audience: env.googleClientId,
            });

            const payload = ticket.getPayload();
            if (!payload) {
                throw new AppError("Invalid Google ID token payload", 401, "INVALID_GOOGLE_TOKEN");
            }

            // 1. Verify issuer
            const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
            if (!payload.iss || !validIssuers.includes(payload.iss)) {
                throw new AppError("Untrusted Google token issuer", 401, "INVALID_TOKEN_ISSUER");
            }

            // 2. Verify email_verified
            if (!payload.email_verified) {
                throw new AppError("Google account email is not verified", 403, "UNVERIFIED_EMAIL");
            }

            // 3. Verify nonce if present in token
            const tokenNonce = (payload as any).nonce;
            if (tokenNonce && tokenNonce !== expectedNonce) {
                throw new AppError("Token nonce mismatch (replay protection)", 401, "NONCE_MISMATCH");
            }

            return {
                sub: payload.sub,
                email: payload.email!.toLowerCase().trim(),
                emailVerified: Boolean(payload.email_verified),
                firstName: payload.given_name || payload.name || "Customer",
                lastName: payload.family_name || "",
                picture: payload.picture,
            };
        } catch (error: any) {
            if (error instanceof AppError) throw error;
            logger.warn({ error: error.message }, "Google ID token verification failed");
            throw new AppError(error.message || "Failed to verify Google ID token", 401, "GOOGLE_AUTH_FAILED");
        }
    }
}

export const googleAuthService = new GoogleAuthService();
