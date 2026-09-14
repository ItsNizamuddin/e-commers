import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
    if (!redisConnection) {
        redisConnection = new Redis({
            host: env.redisHost,
            port: env.redisPort,
            password: env.redisPassword || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redisConnection.on("error", (err) => {
            logger.warn({ err: err.message }, "Redis connection warning");
        });

        redisConnection.on("connect", () => {
            logger.info(`Connected to Redis at ${env.redisHost}:${env.redisPort}`);
        });
    }

    return redisConnection;
}

export interface Queues {
    notifications: Queue;
    documents: Queue;
    bulkProcessing: Queue;
    maintenance: Queue;
}

let queues: Queues | null = null;

export function getQueues(): Queues {
    if (!queues) {
        const connection = getRedisConnection();

        queues = {
            notifications: new Queue("notifications", {
                connection,
                defaultJobOptions: {
                    attempts: 5,
                    backoff: { type: "exponential", delay: 2000 },
                    removeOnComplete: { count: 1000 },
                    removeOnFail: { count: 5000 },
                },
            }),
            documents: new Queue("documents", {
                connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: "fixed", delay: 5000 },
                    removeOnComplete: { count: 500 },
                    removeOnFail: { count: 2000 },
                },
            }),
            bulkProcessing: new Queue("bulk-processing", {
                connection,
                defaultJobOptions: {
                    attempts: 2,
                    backoff: { type: "fixed", delay: 10000 },
                    removeOnComplete: { count: 100 },
                    removeOnFail: { count: 1000 },
                },
            }),
            maintenance: new Queue("maintenance", {
                connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 5000 },
                    removeOnComplete: { count: 200 },
                    removeOnFail: { count: 1000 },
                },
            }),
        };
    }

    return queues;
}

export async function closeQueues(): Promise<void> {
    if (queues) {
        await Promise.all([
            queues.notifications.close(),
            queues.documents.close(),
            queues.bulkProcessing.close(),
            queues.maintenance.close(),
        ]);
        queues = null;
    }

    if (redisConnection) {
        await redisConnection.quit().catch(() => {});
        redisConnection = null;
    }
}
