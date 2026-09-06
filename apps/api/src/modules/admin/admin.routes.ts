import { Router } from "express";
import { Permissions } from "@shopsphere/types";

import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requirePermission } from "../../middleware/authorize.middleware.js";
import { userIdParamsSchema } from "../users/user.validation.js";
import {
    createStaffUser,
    listStaffUsers,
    updateUserRole,
    updateUserStatus,
    getDashboard,
    getSalesAnalytics,
    getCustomers,
} from "./admin.controller.js";
import {
    createStaffUserSchema,
    listStaffUsersQuerySchema,
    updateUserRoleSchema,
    updateUserStatusSchema,
    adminDashboardQuerySchema,
    salesAnalyticsQuerySchema,
    customerListQuerySchema,
} from "./admin.validation.js";
import { adminInventoryRouter } from "../inventory/inventory.routes.js";

const router = Router();

// Sub-router for Admin Inventory Operations (/admin/inventory/*)
router.use("/inventory", adminInventoryRouter);

// Executive Dashboard KPIs & Metrics (Requires 'analytics.read' permission - SUPER_ADMIN & ADMIN)
router.get(
    "/dashboard",
    requireAuth,
    requirePermission(Permissions.ANALYTICS_READ),
    validate(adminDashboardQuerySchema, "query"),
    asyncHandler(getDashboard),
);

// Sales & Revenue Time-Series Analytics
router.get(
    "/analytics/sales",
    requireAuth,
    requirePermission(Permissions.ANALYTICS_READ),
    validate(salesAnalyticsQuerySchema, "query"),
    asyncHandler(getSalesAnalytics),
);

// Customer Accounts List with aggregated lifetime value & order metrics
router.get(
    "/customers",
    requireAuth,
    requirePermission(Permissions.CUSTOMER_READ),
    validate(customerListQuerySchema, "query"),
    asyncHandler(getCustomers),
);

// Create new Staff / Admin account (Requires 'staff.create' permission - SUPER_ADMIN)
router.post(
    "/users",
    requireAuth,
    requirePermission(Permissions.STAFF_CREATE),
    validate(createStaffUserSchema, "body"),
    asyncHandler(createStaffUser),
);

// List Staff / Admin accounts (Requires 'staff.read' permission - SUPER_ADMIN & ADMIN)
router.get(
    "/users",
    requireAuth,
    requirePermission(Permissions.STAFF_READ),
    validate(listStaffUsersQuerySchema, "query"),
    asyncHandler(listStaffUsers),
);

// Modify user role (Requires 'staff.role.update' permission - SUPER_ADMIN)
router.patch(
    "/users/:id/role",
    requireAuth,
    requirePermission(Permissions.STAFF_ROLE_UPDATE),
    validate(userIdParamsSchema, "params"),
    validate(updateUserRoleSchema, "body"),
    asyncHandler(updateUserRole),
);

// Modify user active/inactive status (Requires 'staff.status.update' permission - SUPER_ADMIN & ADMIN)
router.patch(
    "/users/:id/status",
    requireAuth,
    requirePermission(Permissions.STAFF_STATUS_UPDATE),
    validate(userIdParamsSchema, "params"),
    validate(updateUserStatusSchema, "body"),
    asyncHandler(updateUserStatus),
);

export default router;
