import type { Request, Response } from "express";
import { queueJobService } from "./queue-job.service.js";

export class QueueJobController {
    async listJobs(req: Request, res: Response) {
        const { queueName, status, jobName, aggregateType, aggregateId, referenceNumber, correlationId, page, limit } =
            req.query as Record<string, string | undefined>;

        const result = await queueJobService.listJobs({
            queueName,
            status,
            jobName,
            aggregateType,
            aggregateId,
            referenceNumber,
            correlationId,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });

        res.json({
            success: true,
            data: result.jobs,
            pagination: result.pagination,
        });
    }

    async getJob(req: Request, res: Response) {
        const { jobId } = req.params;
        const job = await queueJobService.getJobByJobId(jobId as string);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: `Background job with ID '${jobId}' not found.`,
                },
            });
        }

        res.json({
            success: true,
            data: job,
        });
    }
}

export const queueJobController = new QueueJobController();
