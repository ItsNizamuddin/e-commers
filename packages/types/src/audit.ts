import { UserRole } from "./user.js";

export interface AuditActor {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface AuditFields {
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
}

export const AuditActions = {
    AUTH_LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
    AUTH_LOGIN_FAILURE: "AUTH_LOGIN_FAILURE",
    AUTH_LOGOUT: "AUTH_LOGOUT",

    STAFF_CREATED: "STAFF_CREATED",
    STAFF_ROLE_UPDATED: "STAFF_ROLE_UPDATED",
    STAFF_STATUS_UPDATED: "STAFF_STATUS_UPDATED",

    PRODUCT_CREATED: "PRODUCT_CREATED",
    PRODUCT_UPDATED: "PRODUCT_UPDATED",
    PRODUCT_DELETED: "PRODUCT_DELETED",
    PRODUCT_PUBLISHED: "PRODUCT_PUBLISHED",

    CATEGORY_CREATED: "CATEGORY_CREATED",
    CATEGORY_UPDATED: "CATEGORY_UPDATED",
    CATEGORY_DELETED: "CATEGORY_DELETED",
    CATEGORY_REORDERED: "CATEGORY_REORDERED",

    INVENTORY_ADJUSTED: "INVENTORY_ADJUSTED",
    INVENTORY_THRESHOLDS_UPDATED: "INVENTORY_THRESHOLDS_UPDATED",

    ORDER_FULFILLMENT_UPDATED: "ORDER_FULFILLMENT_UPDATED",
    ORDER_CANCELLED: "ORDER_CANCELLED",

    SEO_BULK_IMPORT: "SEO_BULK_IMPORT",
    SEO_AUTO_FILLED: "SEO_AUTO_FILLED",
    SEO_METADATA_UPDATED: "SEO_METADATA_UPDATED",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions] | (string & {});

export interface AuditLogTarget {
    resource: string;
    resourceId?: string | undefined;
    details?: Record<string, unknown> | undefined;
}

export interface AuditLogEntry {
    id: string;
    action: AuditAction;
    actor: AuditActor;
    target?: AuditLogTarget | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    status: "SUCCESS" | "FAILURE";
    errorMessage?: string | undefined;
    createdAt: string;
}

export interface AuditLogQuery {
    page?: number | undefined;
    limit?: number | undefined;
    action?: string | undefined;
    resource?: string | undefined;
    actorId?: string | undefined;
    search?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}

export interface AuditLogListResponse {
    items: AuditLogEntry[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
