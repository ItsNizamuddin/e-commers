import type { Request } from "express";
import { AuditLogModel, IAuditLog } from "./audit-log.model.js";
import { UserModel } from "../users/user.model.js";
import type {
    AuditAction,
    AuditActor,
    AuditLogEntry,
    AuditLogQuery,
    AuditLogTarget,
    UserRole,
} from "@ecommers/types";
import { logger } from "../../config/logger.js";

export interface RecordAuditParams {
    action: AuditAction;
    actor: AuditActor | { id: string; role: UserRole; name?: string; email?: string };
    target?: AuditLogTarget | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    status?: "SUCCESS" | "FAILURE" | undefined;
    errorMessage?: string | undefined;
}

export function toAuditLogEntry(doc: IAuditLog): AuditLogEntry {
    return {
        id: doc._id.toString(),
        action: doc.action,
        actor: {
            id: doc.actor.id,
            name: doc.actor.name,
            email: doc.actor.email,
            role: doc.actor.role,
        },
        target: doc.target
            ? {
                  resource: doc.target.resource,
                  resourceId: doc.target.resourceId,
                  details: doc.target.details,
              }
            : undefined,
        ipAddress: doc.ipAddress,
        userAgent: doc.userAgent,
        status: doc.status,
        errorMessage: doc.errorMessage,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    };
}

export const auditLogService = {
    /**
     * Resolves an AuditActor from a user reference, fetching profile details if omitted.
     */
    async resolveActor(user: { id: string; role: UserRole; name?: string; email?: string }): Promise<AuditActor> {
        if (user.name && user.email) {
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            };
        }
        try {
            const doc = await UserModel.findById(user.id).select("firstName lastName email role").lean();
            if (doc) {
                return {
                    id: doc._id.toString(),
                    name: `${doc.firstName} ${doc.lastName}`.trim() || doc.email,
                    email: doc.email,
                    role: doc.role as UserRole,
                };
            }
        } catch {
            // fallback if lookup fails
        }
        return {
            id: user.id,
            name: "Staff Member",
            email: "staff@ecommers.local",
            role: user.role,
        };
    },

    /**
     * Safely records an immutable audit log entry.
     * Guaranteed non-blocking and will never throw to protect primary business mutations.
     */
    async record(params: RecordAuditParams): Promise<void> {
        try {
            const resolvedActor = await this.resolveActor(params.actor);
            const docToCreate: Record<string, unknown> = {
                action: params.action,
                actor: resolvedActor,
                status: params.status || "SUCCESS",
            };

            if (params.target) {
                docToCreate.target = params.target;
            }
            if (params.ipAddress) {
                docToCreate.ipAddress = params.ipAddress;
            }
            if (params.userAgent) {
                docToCreate.userAgent = params.userAgent;
            }
            if (params.errorMessage) {
                docToCreate.errorMessage = params.errorMessage;
            }

            await AuditLogModel.create(docToCreate);
        } catch (error) {
            logger.error(error, `Failed to record audit log for action: ${params.action}`);
        }
    },

    /**
     * Modular helper to record an audit log directly from an Express Request context.
     * Automatically extracts client IP, User-Agent, and actor context.
     */
    async recordFromRequest(
        req: Request,
        params: {
            action: AuditAction;
            actor?: AuditActor | { id: string; role: UserRole; name?: string; email?: string } | undefined;
            target?: AuditLogTarget | undefined;
            status?: "SUCCESS" | "FAILURE" | undefined;
            errorMessage?: string | undefined;
        },
    ): Promise<void> {
        const actor = params.actor || req.user;
        if (!actor) {
            return;
        }

        const ip = req.ip ||
            (typeof req.headers["x-forwarded-for"] === "string"
                ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
                : req.socket.remoteAddress);

        const userAgent = req.get("user-agent");

        return this.record({
            action: params.action,
            actor,
            target: params.target,
            ipAddress: typeof ip === "string" ? ip : undefined,
            userAgent,
            status: params.status,
            errorMessage: params.errorMessage,
        });
    },

    /**
     * Lists audit log entries with multi-attribute filtering and pagination.
     */
    async list(query: AuditLogQuery = {}) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};

        if (query.action) {
            filter.action = query.action;
        }

        if (query.resource) {
            filter["target.resource"] = query.resource;
        }

        if (query.actorId) {
            filter["actor.id"] = query.actorId;
        }

        if (query.search) {
            const searchRegex = new RegExp(query.search.trim(), "i");
            filter.$or = [
                { "actor.name": searchRegex },
                { "actor.email": searchRegex },
                { "target.resource": searchRegex },
                { "target.resourceId": searchRegex },
                { action: searchRegex },
            ];
        }

        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) {
                (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
            }
            if (query.endDate) {
                (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
            }
        }

        const [records, total] = await Promise.all([
            AuditLogModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            AuditLogModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return {
            items: records.map(toAuditLogEntry),
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    },
};
