import { z } from "zod";

export const auditLogQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    action: z.string().trim().optional(),
    resource: z.string().trim().optional(),
    actorId: z.string().trim().optional(),
    search: z.string().trim().optional(),
    startDate: z.string().trim().datetime({ offset: true }).optional().or(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    endDate: z.string().trim().datetime({ offset: true }).optional().or(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
