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
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "400px",
                    textAlign: "center",
                    padding: "3rem 1.5rem",
                }}
            >
                <div
                    style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "16px",
                        backgroundColor: "var(--ec-danger-bg, #fef2f2)",
                        border: "1px solid var(--ec-danger-border, #fecaca)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ec-danger, #dc2626)",
                        marginBottom: "1.25rem",
                    }}
                >
                    <ShieldX size={28} />
                </div>
                <h2
                    style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: "var(--ec-text-primary, #0f172a)",
                        marginBottom: "0.5rem",
                    }}
                >
                    Access Restricted
                </h2>
                <p
                    style={{
                        fontSize: "0.875rem",
                        color: "var(--ec-text-muted, #64748b)",
                        maxWidth: "420px",
                        lineHeight: 1.5,
                        marginBottom: "1.5rem",
                    }}
                >
                    Your current account role (<strong>{role.replace("_", " ")}</strong>) does not have the required permissions to access this backoffice area.
                </p>
                <Link
                    href="/dashboard"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.5rem 1.25rem",
                        borderRadius: "8px",
                        backgroundColor: "var(--ec-primary-600, #2563eb)",
                        color: "#ffffff",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                    }}
                >
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
