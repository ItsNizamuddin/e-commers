"use client";

import React from "react";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useAppSelector } from "../../store";
import type { UserRole, Permission } from "@ecommers/types";
import { ROLE_PERMISSIONS } from "@ecommers/types";

interface RequireRoleProps {
    allowedRoles?: UserRole[];
    requiredPermission?: Permission;
    children: React.ReactNode;
}

export function RequireRole({
    allowedRoles,
    requiredPermission,
    children,
}: RequireRoleProps) {
    const role = useAppSelector((state) => state.auth.role);

    if (!role) {
        return <>{children}</>;
    }

    let isAuthorized = true;

    if (allowedRoles && !allowedRoles.includes(role)) {
        isAuthorized = false;
    }

    if (requiredPermission) {
        const permissions = ROLE_PERMISSIONS[role] || [];
        if (!permissions.includes(requiredPermission)) {
            isAuthorized = false;
        }
    }

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-12">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5">
                    <ShieldX size={28} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Access Restricted
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
                    Your current account role (<strong>{role.replace("_", " ")}</strong>) does not have the required permissions to access this backoffice area.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
