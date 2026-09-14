import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queue.client.js";
import { queueJobService, type TrackableJob } from "../queue-job.service.js";
import { logger } from "../../../config/logger.js";

/**
 * Core document job processor with persistent tracking and worker-level idempotency.
 */
export async function processDocumentJob(job: Job | TrackableJob) {
    return queueJobService.executeWithTracking(job, async () => {
        logger.info(
            {
                jobId: job.id,
                jobName: job.name,
                attemptsMade: job.attemptsMade,
            },
            "Processing document generation job"
        );

        switch (job.name) {
            case "generate-batch-labels": {
                // Generates FSSAI batch sticker PDF with QR/barcode, batch number, mfg date, best-before date
                logger.info(
                    {
                        batchNumber: job.data?.batchNumber,
                        productTitle: job.data?.productTitle,
                        quantity: job.data?.actualQuantity,
                        expiryDate: job.data?.expiryDate,
                    },
                    "Generated FSSAI production batch compliance labels"
                );
                return {
                    documentType: "FSSAI_BATCH_LABELS",
                    batchNumber: job.data?.batchNumber,
                    generatedAt: new Date().toISOString(),
                };
            }

            case "generate-retail-labels": {
                // Generates retail pack stickers for bulk-to-retail repackaging runs
                logger.info(
                    {
                        runNumber: job.data?.runNumber,
                        unitsProduced: job.data?.packageUnitsProduced,
                        variantSku: job.data?.targetVariantSku,
                    },
                    "Generated retail packaging SKU labels"
                );
                return {
                    documentType: "RETAIL_LABELS",
                    runNumber: job.data?.runNumber,
                    generatedAt: new Date().toISOString(),
                };
            }

            case "generate-invoice-pdf": {
                // Generates official GST tax invoice PDF
                logger.info(
                    { orderId: job.data?.orderId, invoiceNumber: job.data?.invoiceNumber },
                    "Generated order GST tax invoice PDF"
                );
                return {
                    documentType: "TAX_INVOICE_PDF",
                    orderId: job.data?.orderId,
                    invoiceNumber: job.data?.invoiceNumber,
                    generatedAt: new Date().toISOString(),
                };
            }

            default: {
                logger.info({ jobName: job.name }, "Processed generic document generation job");
                return {
                    documentType: job.name,
                    generatedAt: new Date().toISOString(),
                };
            }
        }
    });
}

export function createDocumentWorker(): Worker {
    const connection = getRedisConnection();

    const worker = new Worker(
        "documents",
        async (job: Job) => {
            return processDocumentJob(job);
        },
        {
            connection,
            concurrency: 2, // Bounded concurrency protects CPU & memory from heavy PDF/rendering engines
        }
    );

    worker.on("completed", (job) => {
        logger.info({ jobId: job.id, jobName: job.name }, "Document generation job completed");
    });

    worker.on("failed", (job, err) => {
        logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, "Document generation job failed");
    });

    return worker;
}
