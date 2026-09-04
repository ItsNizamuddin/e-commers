import type { RequestHandler } from "express";
import {
    type UserRole,
    type Permission,
    ROLE_PERMISSIONS,
    STAFF_ROLES,
} from "@shopsphere/types";

import { AppError } from "../utils/app-error.js";

/**
 * Checks whether a given role has a specific permission.
 */
export const hasPermission = (
    role: UserRole,
    permission: Permission,
): boolean => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

/**
 * Checks whether a given role has ALL of the specified permissions.
 */
export const hasAllPermissions = (
    role: UserRole,
    permissions: Permission[],
): boolean => {
    return permissions.every((perm) => hasPermission(role, perm));
};

/**
 * Checks whether a given role has AT LEAST ONE of the specified permissions.
 */
export const hasAnyPermission = (
    role: UserRole,
    permissions: Permission[],
): boolean => {
    return permissions.some((perm) => hasPermission(role, perm));
};

/**
 * Restricts access to users matching one of the specified allowed roles.
 */
export const requireRole = (
    ...allowedRoles: UserRole[]
): RequestHandler => {
    return (req, _res, next) => {
        if (!req.user) {
            next(
                new AppError(
                    "Authentication required",
                    401,
                    "AUTHENTICATION_REQUIRED",
                ),
            );
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            next(
                new AppError(
                    "You are not authorized to perform this action",
                    403,
                    "FORBIDDEN",
                ),
            );
            return;
        }

        next();
    };
};

/**
 * Restricts access to staff/admin roles (SUPER_ADMIN, ADMIN, SALES, PUBLISHER, SUPPORT_AGENT).
 */
export const requireStaff = (): RequestHandler => {
    return requireRole(...STAFF_ROLES);
};

/**
 * Restricts access to users possessing ALL required permissions.
 */
export const requirePermission = (
    ...requiredPermissions: Permission[]
): RequestHandler => {
    return (req, _res, next) => {
        if (!req.user) {
            next(
                new AppError(
                    "Authentication required",
                    401,
                    "AUTHENTICATION_REQUIRED",
                ),
            );
            return;
        }

        if (!hasAllPermissions(req.user.role, requiredPermissions)) {
            next(
                new AppError(
                    "You lack the required permissions to perform this action",
                    403,
                    "FORBIDDEN",
                ),
            );
            return;
        }

        next();
    };
};

/**
 * Restricts access to users possessing AT LEAST ONE of the specified permissions.
 */
export const requireAnyPermission = (
    ...permissions: Permission[]
): RequestHandler => {
    return (req, _res, next) => {
        if (!req.user) {
            next(
                new AppError(
                    "Authentication required",
                    401,
                    "AUTHENTICATION_REQUIRED",
                ),
            );
            return;
        }

        if (!hasAnyPermission(req.user.role, permissions)) {
            next(
                new AppError(
                    "You lack the required permissions to perform this action",
                    403,
                    "FORBIDDEN",
                ),
            );
            return;
        }

        next();
    };
};