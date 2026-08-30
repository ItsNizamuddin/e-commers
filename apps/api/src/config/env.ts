import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(5001),

    CORS_ORIGIN: z
        .string()
        .min(1)
        .default("http://localhost:3000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("❌ Invalid environment configuration:");
    console.error(parsedEnv.error.flatten().fieldErrors);

    process.exit(1);
}

export const env = {
    nodeEnv: parsedEnv.data.NODE_ENV,
    port: parsedEnv.data.PORT,
    corsOrigin: parsedEnv.data.CORS_ORIGIN,
} as const;