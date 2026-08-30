import pino, { type LoggerOptions } from "pino";
import { env } from "./env.js";

const loggerOptions: LoggerOptions = {
    level: env.logLevel,
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