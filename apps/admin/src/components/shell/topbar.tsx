"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    LogOut,
    Search,
    Sun,
    Bell,
    ChevronDown,
    Loader2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearSession } from "../../store/auth-slice";
import { api, setAccessToken } from "../../lib/api";

export function Topbar() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await api.auth.adminLogout();
        } catch {
            // Even if network fails, proceed with client cleanup
        } finally {
            setAccessToken(null);
            dispatch(clearSession());
            router.replace("/login");
        }
    };

    const initials = user
        ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AD"
        : "AD";

    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0]
        : "Administrator";

    return (
        <header
            style={{
                height: "64px",
                backgroundColor: "#ffffff",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1.5rem",
                position: "sticky",
                top: 0,
                zIndex: 40,
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.02)",
            }}
        >
            {/* Left: Brand Identity */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                    style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.9375rem",
                        boxShadow: "0 2px 6px -1px rgba(37, 99, 235, 0.4)",
                    }}
                >
                    E
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                    <span
                        style={{
                            fontSize: "1.125rem",
                            fontWeight: 800,
                            letterSpacing: "-0.03em",
                            color: "#0f172a",
                        }}
                    >
                        ecommers
                    </span>
                    <span
                        style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "#2563eb",
                            letterSpacing: "0.02em",
                        }}
                    >
                        PORTAL
                    </span>
                </div>
            </div>

            {/* Right: Search, Notifications, User Chip */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

                {/* Search Bar with ⌘K */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "9999px",
                        padding: "0.3125rem 0.75rem",
                        width: "180px",
                    }}
                >
                    <Search size={14} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search..."
                        style={{
                            border: "none",
                            background: "transparent",
                            fontSize: "0.75rem",
                            outline: "none",
                            width: "100%",
                            color: "#0f172a",
                        }}
                    />
                    <span
                        style={{
                            fontSize: "0.6875rem",
                            color: "#94a3b8",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "4px",
                            padding: "0 4px",
                            lineHeight: "16px",
                            fontFamily: "monospace",
                        }}
                    >
                        ⌘K
                    </span>
                </div>

                {/* Theme Toggle */}
                <button
                    type="button"
                    title="Toggle Theme"
                    style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <Sun size={15} />
                </button>

                {/* Notifications Bell */}
                <button
                    type="button"
                    title="Notifications"
                    style={{
                        position: "relative",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <Bell size={15} />
                    <span
                        style={{
                            position: "absolute",
                            top: "7px",
                            right: "7px",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#ef4444",
                        }}
                    />
                </button>

                {/* User Profile Chip */}
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                            padding: "0.25rem 0.75rem 0.25rem 0.25rem",
                            borderRadius: "9999px",
                            backgroundColor: "#0f172a",
                            color: "#ffffff",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <div
                            style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                display: "flex",
                                alignItems: "center",
                                justifySelf: "center",
                                justifyContent: "center",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                color: "#f8fafc",
                            }}
                        >
                            {initials}
                        </div>
                        <div style={{ textAlign: "left", lineHeight: 1.1 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                                {displayName}
                            </div>
                            <div style={{ fontSize: "0.625rem", color: "#94a3b8" }}>
                                {role ? role.replace("_", " ") : "Super Admin"}
                            </div>
                        </div>
                        <ChevronDown size={12} color="#94a3b8" style={{ marginLeft: "2px" }} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 8px)",
                                width: "200px",
                                backgroundColor: "#ffffff",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                                padding: "0.5rem",
                                zIndex: 50,
                            }}
                        >
                            <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0f172a" }}>
                                    {displayName}
                                </div>
                                <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>
                                    {user?.email || "admin@ecommers.local"}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push("/account");
                                }}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "0.5rem 0.75rem",
                                    fontSize: "0.8125rem",
                                    color: "#334155",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    marginTop: "0.25rem",
                                }}
                            >
                                Account Settings
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    fontSize: "0.8125rem",
                                    color: "#dc2626",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: isLoggingOut ? "not-allowed" : "pointer",
                                    marginTop: "0.25rem",
                                }}
                            >
                                {isLoggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
