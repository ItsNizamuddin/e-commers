import "dotenv/config";

const port = Number(process.env.PORT ?? 5001);

if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port,
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
} as const;