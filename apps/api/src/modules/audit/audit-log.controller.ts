import type { Request, Response } from "express";
import { auditLogService } from "./audit-log.service.js";
import type { AuditLogQuery } from "@ecommers/types";

export const listAuditLogs = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const query = req.query as unknown as AuditLogQuery;
    const result = await auditLogService.list(query);

    res.status(200).json({
        success: true,
        data: {
            items: result.items,
            pagination: result.pagination,
        },
    });
};
