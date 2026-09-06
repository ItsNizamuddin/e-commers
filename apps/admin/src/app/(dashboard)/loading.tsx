"use client";

import React from "react";
import { Spinner } from "@ecommers/ui";

export default function DashboardLoading() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "360px",
                width: "100%",
                padding: "3rem 1.5rem",
                gap: "1rem",
            }}
        >
            <div
                style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: "var(--ec-primary-50, #eff6ff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--ec-primary-100, #dbeafe)",
                    color: "var(--ec-primary-600, #2563eb)",
                    boxShadow: "0 2px 4px 0 rgba(37, 99, 235, 0.06)",
                }}
            >
                <Spinner size="md" style={{ color: "var(--ec-primary-600, #2563eb)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ec-text-primary, #0f172a)" }}>
                    Loading...
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--ec-text-muted, #64748b)", marginTop: "0.125rem" }}>
                    Fetching records from ecommers backoffice
                </div>
            </div>
        </div>
    );
}
