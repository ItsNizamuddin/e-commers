"use client";

import React from "react";
import { AuthGuard } from "../../components/auth-guard";
import { AdminShell } from "../../components/shell/admin-shell";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <AdminShell>{children}</AdminShell>
        </AuthGuard>
    );
}
