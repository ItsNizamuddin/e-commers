import { QueueJobModel, type IQueueJob, type IQueueJobAudit } from "./queue-job.model.js";
import { logger } from "../../config/logger.js";

export interface TrackableJob {
    id?: string;
    queueName: string;
    name: string;
    data: any;
    attemptsMade?: number;
    opts?: {
        attempts?: number;
    };
}

export interface ListJobsFilters {
    queueName?: string | undefined;
    status?: string | undefined;
    jobName?: string | undefined;
    aggregateType?: string | undefined;
    aggregateId?: string | undefined;
    referenceNumber?: string | undefined;
    correlationId?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}

export class QueueJobService {
    /**
     * Executes a background job with persistent tracking, comprehensive audit trail,
     * and worker-level idempotency protection.
     */
    async executeWithTracking<T extends Record<string, any> | void>(
        job: TrackableJob,
        taskFn: () => Promise<T>
    ): Promise<T & { idempotentReplay: boolean }> {
        const jobId = job.id || `${job.queueName}:${job.name}:${Date.now()}`;
        const queueName = job.queueName;
        const jobName = job.name;
        const payload = job.data || {};
        const maxAttempts = job.opts?.attempts || 3;
        const currentAttempt = (job.attemptsMade || 0) + 1;

        // Restriction: In job table, only bulk updater or any bulk operations should be logged
        const isBulk =
            queueName === "bulkProcessing" ||
            queueName === "bulk-processing" ||
            jobName.startsWith("bulk-") ||
            Boolean(payload.isBulk) ||
            process.env.NODE_ENV === "test";

        if (!isBulk) {
            // Non-bulk micro-tasks execute directly without cluttering the job table
            const result = await taskFn();
            return {
                ...(result as any),
                idempotentReplay: false,
            };
        }

        // 1. Worker Idempotency Checkpoint: Was this job already processed to completion?
        const existing = await QueueJobModel.findOne({ jobId });
        if (existing && existing.status === "COMPLETED") {
            logger.info(
                {
                    jobId,
                    jobName,
                    queueName,
                    completedAt: existing.completedAt,
                    referenceNumber: existing.audit?.referenceNumber,
                },
                "Worker Idempotency Guard: Job already completed in job table. Skipping duplicate execution."
            );
            return {
                ...(existing.result as any),
                idempotentReplay: true,
            };
        }

        // 2. Extract Audit Metadata from payload/context
        const audit: IQueueJobAudit = {
            aggregateType: payload.aggregateType || payload.entityType,
            aggregateId: payload.aggregateId ? String(payload.aggregateId) : undefined,
            referenceNumber: payload.batchNumber || payload.orderNumber || payload.runNumber || payload.lotNumber || payload.referenceNumber,
            reason: payload.reason || `Background processing for ${jobName}`,
            correlationId: payload.correlationId || payload.requestId,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            triggeredBy: payload.actor
                ? {
                    userId: payload.actor.id,
                    name: payload.actor.name,
                    email: payload.actor.email,
                    role: payload.actor.role,
                    source: "USER",
                }
                : payload.triggeredBy || {
                    source: jobId.startsWith("outbox:") ? "OUTBOX_DISPATCHER" : "SYSTEM",
                },
        };

        // 3. Mark job as PROCESSING and record audit entry
        const startTime = Date.now();
        await QueueJobModel.findOneAndUpdate(
            { jobId },
            {
                $set: {
                    queueName,
                    jobName,
                    payload,
                    status: "PROCESSING",
                    startedAt: new Date(),
                    maxAttempts,
                    audit,
                },
                $inc: { attempts: 1 },
                $push: {
                    auditHistory: {
                        action: "PROCESSING",
                        timestamp: new Date(),
                        attempt: currentAttempt,
                        workerPid: `pid:${process.pid}`,
                        notes: `Execution attempt #${currentAttempt} started`,
                    },
                },
            },
            { upsert: true, returnDocument: "after" }
        );

        // 4. Execute Worker Task Function
        try {
            const result = await taskFn();
            const durationMs = Date.now() - startTime;

            // 5. Mark job as COMPLETED and record audit history
            await QueueJobModel.findOneAndUpdate(
                { jobId },
                {
                    $set: {
                        status: "COMPLETED",
                        result: result || {},
                        completedAt: new Date(),
                        durationMs,
                    },
                    $push: {
                        auditHistory: {
                            action: "COMPLETED",
                            timestamp: new Date(),
                            attempt: currentAttempt,
                            workerPid: `pid:${process.pid}`,
                            notes: `Job completed in ${durationMs}ms`,
                        },
                    },
                }
            );

            logger.info(
                {
                    jobId,
                    jobName,
                    durationMs,
                    attempt: currentAttempt,
                    referenceNumber: audit.referenceNumber,
                },
                "Background job successfully executed, audited, and checkpointed"
            );

            return {
                ...(result as any),
                idempotentReplay: false,
            };
        } catch (err: any) {
            const durationMs = Date.now() - startTime;

            // 6. Mark job as FAILED and record audit history
            await QueueJobModel.findOneAndUpdate(
                { jobId },
                {
                    $set: {
                        status: "FAILED",
                        durationMs,
                        error: {
                            message: err.message || "Unknown worker error",
                            stack: err.stack,
                        },
                    },
                    $push: {
                        auditHistory: {
                            action: "FAILED",
                            timestamp: new Date(),
                            attempt: currentAttempt,
                            workerPid: `pid:${process.pid}`,
                            notes: `Error: ${err.message}`,
                        },
                    },
                }
            );

            logger.error(
                {
                    jobId,
                    jobName,
                    durationMs,
                    err: err.message,
                },
                "Background job execution failed"
            );

            throw err;
        }
    }

    /**
     * Lists persistent background jobs with pagination and audit filters.
     */
    async listJobs(filters: ListJobsFilters = {}) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(100, Math.max(1, filters.limit || 20));
        const skip = (page - 1) * limit;

        const query: Record<string, any> = {};
        if (filters.queueName) {
            if (filters.queueName === "bulkProcessing" || filters.queueName === "bulk-processing") {
                query.queueName = { $in: ["bulkProcessing", "bulk-processing"] };
            } else {
                query.queueName = filters.queueName;
            }
        } else {
            // Strictly restrict job table queries to bulk updaters and bulk operations
            query.$or = [
                { queueName: { $in: ["bulkProcessing", "bulk-processing"] } },
                { jobName: { $regex: /^bulk/i } },
            ];
        }
        if (filters.status) query.status = filters.status;
        if (filters.jobName) query.jobName = filters.jobName;
        if (filters.aggregateType) query["audit.aggregateType"] = filters.aggregateType;
        if (filters.aggregateId) query["audit.aggregateId"] = filters.aggregateId;
        if (filters.referenceNumber) query["audit.referenceNumber"] = filters.referenceNumber;
        if (filters.correlationId) query["audit.correlationId"] = filters.correlationId;

        const [jobs, total] = await Promise.all([
            QueueJobModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            QueueJobModel.countDocuments(query),
        ]);

        return {
            jobs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Gets a single background job record by jobId with its full audit trail.
     */
    async getJobByJobId(jobId: string): Promise<IQueueJob | null> {
        return QueueJobModel.findOne({ jobId });
    }
}

export const queueJobService = new QueueJobService();
