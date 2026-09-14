export type QueueJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface QueueJobAudit {
    triggeredBy?: {
        userId?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        role?: string | undefined;
        source: "USER" | "OUTBOX_DISPATCHER" | "CRON_SCHEDULER" | "SYSTEM";
    } | undefined;
    aggregateType?: "ProductionRun" | "RepackagingRun" | "Order" | "RawMaterialLot" | "RawMaterial" | "User" | "System" | "SEO" | "Product" | "Category" | undefined;
    aggregateId?: string | undefined;
    referenceNumber?: string | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    correlationId?: string | undefined;
    reason?: string | undefined;
}

export interface QueueJobAuditHistory {
    action: "CREATED" | "PROCESSING" | "COMPLETED" | "FAILED" | "RETRY_TRIGGERED";
    timestamp: string | Date;
    attempt: number;
    workerPid?: string;
    notes?: string;
}

export interface QueueJobItem {
    id?: string;
    _id?: string;
    jobId: string;
    queueName: string;
    jobName: string;
    status: QueueJobStatus;
    payload: Record<string, any>;
    result?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
    };
    attempts: number;
    maxAttempts: number;
    startedAt?: string | Date;
    completedAt?: string | Date;
    durationMs?: number;
    audit?: QueueJobAudit;
    auditHistory?: QueueJobAuditHistory[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface QueueJobsQuery {
    queueName?: string;
    status?: QueueJobStatus | string;
    jobName?: string;
    aggregateType?: string;
    aggregateId?: string;
    referenceNumber?: string;
    correlationId?: string;
    page?: number;
    limit?: number;
}

export interface QueueJobsListResponse {
    items: QueueJobItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
