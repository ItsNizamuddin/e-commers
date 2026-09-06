"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AdminShellProps {
    children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
    return (
        <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
            <Sidebar />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <Topbar />
                <main
                    style={{
                        flex: 1,
                        padding: "1.5rem 2rem",
                        maxWidth: "1440px",
                        width: "100%",
                        margin: "0 auto",
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
