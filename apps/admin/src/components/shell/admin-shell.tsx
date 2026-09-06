"use client";

import React from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";
import { ContextSidebar } from "./context-sidebar";

interface AdminShellProps {
    children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--ec-bg-app, #f8fafc)", color: "var(--ec-text-primary, #0f172a)" }}>
            {/* Full-width sticky topbar */}
            <Topbar />

            {/* Dual-Sidebar Layout + Main Content */}
            <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 64px)" }}>
                {/* Primary Sidebar */}
                <Sidebar />

                {/* Contextual Sub-Sidebar */}
                <ContextSidebar />

                {/* Main Content Canvas */}
                <main
                    style={{
                        flex: 1,
                        padding: "2rem 2.5rem",
                        maxWidth: "1440px",
                        minWidth: 0,
                        overflowY: "auto",
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
