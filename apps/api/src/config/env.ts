import { config } from "dotenv";
import { resolve } from "path";

// Load from monorepo root
config({ path: resolve(process.cwd(), "../../.env") });
// Load local overrides if any
config();

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(5001),

    CORS_ORIGIN: z
        .string()
        .min(1)
        .default("http://localhost:3000,http://localhost:3001"),

    DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required"),

    JWT_ACCESS_SECRET: z
        .string()
        .min(32, "JWT_ACCESS_SECRET must be at least 32 characters")
        .default("8f4c2d9a7e1b6c3f0a5d8e2b9c7f1a4d6e8b3c0f5a9d2e7c1b6f8a3d0e5c9b2"),

    JWT_REFRESH_SECRET: z
        .string()
        .min(32, "JWT_REFRESH_SECRET must be at least 32 characters")
        .default("3c7a1e9f5b2d8c4a6e0f3b7d9a1c5e8f2b6d4c0a9e7f1b3d5c8a6e2f9b4c7"),

    JWT_ACCESS_EXPIRES_IN: z
        .string()
        .default("15m"),

    JWT_REFRESH_EXPIRES_IN: z
        .string()
        .default("7d"),

    PAYMENT_WEBHOOK_SECRET: z
        .string()
        .default("whsec_mock_local_secret_for_tests"),

    REDIS_HOST: z
        .string()
        .default("127.0.0.1"),

    REDIS_PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(6379),

    REDIS_PASSWORD: z
        .string()
        .optional(),

    ENABLE_QUEUES: z
        .enum(["true", "false"])
        .default("true")
        .transform((val) => val === "true"),

    GOOGLE_CLIENT_ID: z
        .string()
        .default("mock-google-client-id.apps.googleusercontent.com"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsedEnv.error.flatten().fieldErrors);

    process.exit(1);
}

const resolveDatabaseUrl = (url: string, nodeEnv: string): string => {
    if (nodeEnv === "test") {
        if (process.env.TEST_DATABASE_URL) {
            return process.env.TEST_DATABASE_URL;
        }
        if (url.includes("/ecommers?")) {
            return url.replace("/ecommers?", "/ecommers_test?");
        }
        if (url.endsWith("/ecommers")) {
            return `${url}_test`;
        }
    }
    return url;
};

export const env = {
    nodeEnv: parsedEnv.data.NODE_ENV,
    logLevel: parsedEnv.data.LOG_LEVEL,
    port: parsedEnv.data.PORT,
    corsOrigin: parsedEnv.data.CORS_ORIGIN,
    databaseUrl: resolveDatabaseUrl(parsedEnv.data.DATABASE_URL, parsedEnv.data.NODE_ENV),
    jwtAccessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
    jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
    jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
    paymentWebhookSecret: parsedEnv.data.PAYMENT_WEBHOOK_SECRET,
    redisHost: parsedEnv.data.REDIS_HOST,
    redisPort: parsedEnv.data.REDIS_PORT,
    redisPassword: parsedEnv.data.REDIS_PASSWORD,
    enableQueues: parsedEnv.data.NODE_ENV === "test" ? false : parsedEnv.data.ENABLE_QUEUES,
    googleClientId: parsedEnv.data.GOOGLE_CLIENT_ID,
} as const;