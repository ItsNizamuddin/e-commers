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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 gap-4">
                <Spinner size="lg" className="text-blue-600 dark:text-blue-400" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
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
