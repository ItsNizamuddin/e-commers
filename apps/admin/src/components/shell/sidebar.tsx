"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    FolderTree,
    Warehouse,
    Users,
    Star,
    ShieldCheck,
    BarChart3,
    UserCheck,
    ChevronRight,
} from "lucide-react";

interface NavGroup {
    title: string;
    items: {
        label: string;
        href: string;
        icon: React.ElementType;
        badge?: string;
        badgeColor?: string;
        hasSub?: boolean;
    }[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: "OVERVIEW",
        items: [
            { label: "Account Home", href: "/account", icon: UserCheck },
            { label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        title: "INFRASTRUCTURE & TOOLS",
        items: [
            { label: "Orders", href: "/orders", icon: ShoppingBag, hasSub: true },
            { label: "Products", href: "/products", icon: Package, hasSub: true },
            { label: "Categories", href: "/categories", icon: FolderTree },
            { label: "Inventory Matrix", href: "/inventory", icon: Warehouse, hasSub: true },
        ],
    },
    {
        title: "GROWTH & REVENUE",
        items: [
            { label: "Sales Analytics", href: "/analytics", icon: BarChart3 },
            { label: "Customer LTV", href: "/customers", icon: Users },
            { label: "Product Reviews", href: "/reviews", icon: Star },
        ],
    },
    {
        title: "PLATFORM & ACCESS",
        items: [
            { label: "Staff & RBAC", href: "/staff", icon: ShieldCheck },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            style={{
                width: "230px",
                minWidth: "230px",
                backgroundColor: "#ffffff",
                borderRight: "1px solid #f1f5f9",
                height: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: "64px",
                zIndex: 30,
            }}
        >
            {/* Scrollable Navigation */}
            <div
                style={{
                    flex: 1,
                    padding: "1rem 0.75rem",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                }}
            >
                {NAV_GROUPS.map((group) => (
                    <div key={group.title}>
                        <div
                            style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "#94a3b8",
                                padding: "0 0.5rem 0.5rem 0.5rem",
                                textTransform: "uppercase",
                            }}
                        >
                            {group.title}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" && item.href !== "/account" && pathname.startsWith(item.href));

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "0.5rem 0.625rem",
                                            borderRadius: "8px",
                                            textDecoration: "none",
                                            backgroundColor: isActive ? "#f8fafc" : "transparent",
                                            color: isActive ? "#0f172a" : "#475569",
                                            fontWeight: isActive ? 600 : 500,
                                            fontSize: "0.8125rem",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                            <Icon
                                                size={16}
                                                color={isActive ? "#2563eb" : "#64748b"}
                                                strokeWidth={isActive ? 2.25 : 1.75}
                                            />
                                            <span>{item.label}</span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                                            {item.badge && (
                                                <span
                                                    style={{
                                                        fontSize: "0.625rem",
                                                        fontWeight: 700,
                                                        padding: "0.125rem 0.375rem",
                                                        borderRadius: "9999px",
                                                        backgroundColor: item.badgeColor === "#10b981" ? "#ecfdf5" : "#fffbeb",
                                                        color: item.badgeColor === "#10b981" ? "#059669" : "#d97706",
                                                        border: `1px solid ${item.badgeColor === "#10b981" ? "#a7f3d0" : "#fef3c7"}`,
                                                    }}
                                                >
                                                    {item.badge}
                                                </span>
                                            )}
                                            {item.hasSub && (
                                                <ChevronRight size={13} color="#cbd5e1" />
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Status / Build Tag */}
            <div
                style={{
                    padding: "0.875rem 1rem",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.6875rem",
                    color: "#94a3b8",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <span
                        style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            boxShadow: "0 0 6px #10b981",
                        }}
                    />
                    <span>BUILD V1.0.0</span>
                </div>
            </div>
        </aside>
    );
}
