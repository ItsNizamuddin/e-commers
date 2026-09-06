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
                minHeight: "450px",
                width: "100%",
                padding: "4rem 2rem",
                gap: "1.25rem",
            }}
        >
            <div
                style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #dbeafe",
                }}
            >
                <Spinner size="md" className="text-blue-600" />
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>
                    Loading data...
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Fetching records from ecommers backoffice
                </div>
            </div>
        </div>
    );
}
