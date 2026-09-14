import { OutboxEventModel, type IOutboxEvent } from "./outbox.model.js";
import { getQueues } from "../queues/queue.client.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";

export class OutboxDispatcher {
    private isRunning = false;
    private timer: NodeJS.Timeout | null = null;
    private isProcessing = false;

    start(pollIntervalMs = 1500): void {
        if (!env.enableQueues) {
            logger.info("OutboxDispatcher disabled because queues are disabled (test/config mode)");
            return;
        }

        if (this.isRunning) return;
        this.isRunning = true;

        logger.info("Starting OutboxDispatcher polling loop...");

        const poll = async () => {
            if (!this.isRunning) return;
            try {
                await this.processBatch();
            } catch (err: any) {
                logger.error({ err: err.message }, "Error in outbox dispatcher poll cycle");
            } finally {
                if (this.isRunning) {
                    this.timer = setTimeout(poll, pollIntervalMs);
                }
            }
        };

        void poll();
    }

    stop(): void {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        logger.info("OutboxDispatcher stopped.");
    }

    async triggerImmediate(): Promise<void> {
        if (!env.enableQueues) return;
        setImmediate(() => {
            void this.processBatch();
        });
    }

    /**
     * Finds and processes pending outbox events using atomic locking.
     */
    async processBatch(batchSize = 25): Promise<number> {
        if (this.isProcessing) return 0;
        this.isProcessing = true;

        let processedCount = 0;

        try {
            const queues = env.enableQueues ? getQueues() : null;
            const lockTimeout = new Date(Date.now() - 60000); // 1 minute lock expiry for crashed dispatchers

            for (let i = 0; i < batchSize; i++) {
                // Atomically claim the next eligible outbox event
                const event = await OutboxEventModel.findOneAndUpdate(
                    {
                        status: "PENDING",
                        scheduledFor: { $lte: new Date() },
                        $or: [
                            { lockedAt: { $exists: false } },
                            { lockedAt: null },
                            { lockedAt: { $lt: lockTimeout } },
                        ],
                    },
                    {
                        $set: {
                            status: "PROCESSING",
                            lockedAt: new Date(),
                            lockedBy: `pid:${process.pid}`,
                        },
                    },
                    { returnDocument: "after" }
                );

                if (!event) {
                    break; // No more pending events
                }

                try {
                    await this.routeAndEnqueue(event, queues);

                    // Mark event as successfully dispatched
                    await OutboxEventModel.findByIdAndUpdate(event._id, {
                        $set: {
                            status: "DISPATCHED",
                            processedAt: new Date(),
                            lockedAt: null,
                            lockedBy: null,
                        },
                    });

                    processedCount++;
                } catch (enqueueErr: any) {
                    logger.error(
                        {
                            eventId: event._id.toString(),
                            eventType: event.eventType,
                            err: enqueueErr.message,
                        },
                        "Failed to enqueue outbox event to BullMQ; will retry"
                    );

                    await OutboxEventModel.findByIdAndUpdate(event._id, {
                        $set: {
                            status: "PENDING",
                            lockedAt: null,
                            lockedBy: null,
                            lastError: enqueueErr.message,
                        },
                        $inc: { retryCount: 1 },
                    });
                }
            }
        } finally {
            this.isProcessing = false;
        }

        return processedCount;
    }

    /**
     * Maps an outbox event to the appropriate BullMQ queue with a deterministic jobId.
     */
    private async routeAndEnqueue(event: IOutboxEvent, queues: ReturnType<typeof getQueues> | null): Promise<void> {
        if (!queues) {
            return;
        }

        const deterministicJobId = `outbox:${event._id.toString()}`;

        switch (event.eventType) {
            case "PRODUCTION_BATCH_COMPLETED": {
                // Enqueue food batch label generation in documents queue
                await queues.documents.add("generate-batch-labels", event.payload, {
                    jobId: `${deterministicJobId}:label`,
                });
                break;
            }

            case "PRODUCTION_BATCH_REVERSED": {
                // Enqueue staff reversal notification
                await queues.notifications.add("send-reversal-alert", event.payload, {
                    jobId: `${deterministicJobId}:notify`,
                });
                break;
            }

            case "REPACKAGING_COMPLETED": {
                // Enqueue retail pack sticker generation
                await queues.documents.add("generate-retail-labels", event.payload, {
                    jobId: `${deterministicJobId}:label`,
                });
                break;
            }

            case "ORDER_CONFIRMED": {
                // Enqueue order confirmation email + GST invoice generation
                await queues.notifications.add("send-order-email", event.payload, {
                    jobId: `${deterministicJobId}:email`,
                });
                await queues.documents.add("generate-invoice-pdf", event.payload, {
                    jobId: `${deterministicJobId}:invoice`,
                });
                break;
            }

            case "STOCK_BELOW_REORDER": {
                await queues.notifications.add("procurement-reorder-alert", event.payload, {
                    jobId: `${deterministicJobId}:reorder`,
                });
                break;
            }

            case "EXPIRY_WARNING_DIGEST": {
                await queues.notifications.add("fefo-expiry-digest", event.payload, {
                    jobId: `${deterministicJobId}:digest`,
                });
                break;
            }

            default: {
                // Generic notification queue fallback
                await queues.notifications.add(event.eventType.toLowerCase(), event.payload, {
                    jobId: deterministicJobId,
                });
                break;
            }
        }
    }
}

export const outboxDispatcher = new OutboxDispatcher();
