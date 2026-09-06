"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearSession } from "../../store/auth-slice";
import { api, setAccessToken } from "../../lib/api";
import { Badge, Dropdown } from "@ecommers/ui";

export function Topbar() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);

    const handleLogout = async () => {
        try {
            await api.auth.adminLogout();
        } catch {
            // Even if network request fails, clear local state
        } finally {
            setAccessToken(null);
            dispatch(clearSession());
            router.replace("/login");
        }
    };

    const roleBadgeVariant =
        role === "SUPER_ADMIN" ? "danger" : role === "ADMIN" ? "primary" : "neutral";

    return (
        <header
            style={{
                height: "64px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.5rem",
                position: "sticky",
                top: 0,
                zIndex: 30,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>
                    ecommers Enterprise Backoffice
                </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {user && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                                {user.firstName} {user.lastName}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
                        </div>
                        {role && (
                            <Badge variant={roleBadgeVariant} size="sm">
                                {role.replace("_", " ")}
                            </Badge>
                        )}
                        <Dropdown
                            trigger={
                                <button
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        backgroundColor: "#f1f5f9",
                                        border: "1px solid #cbd5e1",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                    }}
                                    aria-label="User profile options"
                                >
                                    <UserIcon size={18} color="#475569" />
                                </button>
                            }
                            items={[
                                {
                                    label: "Sign out",
                                    icon: <LogOut size={14} />,
                                    onClick: handleLogout,
                                    danger: true,
                                },
                            ]}
                        />
                    </div>
                )}
            </div>
        </header>
    );
}
