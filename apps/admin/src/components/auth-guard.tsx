"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../store";
import type { Permission } from "@ecommers/types";
import { Spinner } from "@ecommers/ui";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const { isAuthenticated, isHydrated, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.replace("/login");
        }
    }, [isHydrated, isAuthenticated, router]);

    if (!isHydrated || isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    backgroundColor: "#f8fafc",
                    gap: "1rem",
                }}
            >
                <Spinner size="lg" />
                <p style={{ color: "#64748b", fontSize: "0.875rem", fontFamily: "inherit" }}>
                    Verifying administrative session...
                </p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

interface HasPermissionProps {
    permission: Permission;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function HasPermission({ permission, children, fallback = null }: HasPermissionProps) {
    const permissions = useAppSelector((state) => state.auth.permissions);
    const hasAccess = permissions.includes(permission);

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
