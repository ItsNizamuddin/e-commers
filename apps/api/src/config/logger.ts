import pino, { type LoggerOptions } from "pino";
import { env } from "./env.js";

const loggerOptions: LoggerOptions = {
    level: env.logLevel,
    redact: {
        paths: [
            "password",
            "passwordHash",
            "token",
            "authorization",
            "cookie",
            "*.password",
            "*.passwordHash",
            "req.headers.authorization",
            "req.headers.cookie",
        ],
        censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(env.nodeEnv === "development" && {
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        },
    }),
};

export const logger = pino(loggerOptions);