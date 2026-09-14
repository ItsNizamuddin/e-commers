import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queue.client.js";
import { queueJobService, type TrackableJob } from "../queue-job.service.js";
import { logger } from "../../../config/logger.js";

/**
 * Core notification job processor with persistent tracking and worker-level idempotency.
 */
export async function processNotificationJob(job: Job | TrackableJob) {
    return queueJobService.executeWithTracking(job, async () => {
        logger.info(
            {
                jobId: job.id,
                jobName: job.name,
                attemptsMade: job.attemptsMade,
            },
            "Processing notification job"
        );

        switch (job.name) {
            case "send-order-email": {
                // Simulates dispatching transactional order confirmation via email/SMS/WhatsApp
                logger.info(
                    { orderId: job.data?.orderId, customerEmail: job.data?.customerEmail },
                    "Delivered order confirmation email"
                );
                return {
                    delivered: true,
                    channel: "EMAIL",
                    recipient: job.data?.customerEmail,
                    orderId: job.data?.orderId,
                    sentAt: new Date().toISOString(),
                };
            }

            case "send-reversal-alert": {
                // Simulates alerting warehouse and accounting about a batch or repackaging reversal
                logger.info(
                    {
                        batchNumber: job.data?.batchNumber,
                        reversedQuantity: job.data?.reversedQuantity,
                        reason: job.data?.reason,
                    },
                    "Dispatched staff notification for batch reversal"
                );
                return {
                    alertType: "BATCH_REVERSAL_ALERT",
                    batchNumber: job.data?.batchNumber,
                    dispatchedAt: new Date().toISOString(),
                };
            }

            case "procurement-reorder-alert": {
                // Alert procurement team that raw material or finished SKU is below reorder threshold
                logger.warn(
                    {
                        materialId: job.data?.rawMaterialId,
                        materialName: job.data?.name,
                        currentStock: job.data?.currentStock,
                        threshold: job.data?.reorderThreshold,
                    },
                    "Low-stock threshold reached: procurement alert dispatched"
                );
                return {
                    alertType: "LOW_STOCK_REORDER",
                    materialId: job.data?.rawMaterialId,
                    dispatchedAt: new Date().toISOString(),
                };
            }

            case "fefo-expiry-digest": {
                logger.warn(
                    {
                        expiredCount: job.data?.expiredCount,
                        warnings: job.data?.warningsCount,
                    },
                    "Delivered daily FEFO expiry digest to quality assurance and operations"
                );
                return {
                    alertType: "FEFO_EXPIRY_DIGEST",
                    expiredCount: job.data?.expiredCount,
                    deliveredAt: new Date().toISOString(),
                };
            }

            default: {
                logger.info({ jobName: job.name, data: job.data }, "Processed generic notification job");
                return {
                    notificationType: job.name,
                    deliveredAt: new Date().toISOString(),
                };
            }
        }
    });
}

export function createNotificationWorker(): Worker {
    const connection = getRedisConnection();

    const worker = new Worker(
        "notifications",
        async (job: Job) => {
            return processNotificationJob(job);
        },
        {
            connection,
            concurrency: 10, // Higher concurrency for non-blocking I/O network operations (email, SMS, push)
        }
    );

    worker.on("completed", (job) => {
        logger.info({ jobId: job.id, jobName: job.name }, "Notification job delivered");
    });

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, "Notification job delivery failed");
    });

    return worker;
}
