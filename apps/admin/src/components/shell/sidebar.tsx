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
import { useAppSelector } from "../../store";
import type { UserRole } from "@ecommers/types";

interface NavGroup {
    title: string;
    items: {
        label: string;
        href: string;
        icon: React.ElementType;
        badge?: string;
        badgeColor?: string;
        hasSub?: boolean;
        allowedRoles?: UserRole[];
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
            { label: "Orders", href: "/orders", icon: ShoppingBag, hasSub: true, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"] },
            { label: "Products", href: "/products", icon: Package, hasSub: true, allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER", "SALES", "SUPPORT_AGENT"] },
            { label: "Categories", href: "/categories", icon: FolderTree, allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER"] },
            { label: "Inventory Matrix", href: "/inventory", icon: Warehouse, hasSub: true, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"] },
        ],
    },
    {
        title: "GROWTH & REVENUE",
        items: [
            { label: "Sales Analytics", href: "/analytics", icon: BarChart3, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES"] },
            { label: "Customer LTV", href: "/customers", icon: Users, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"] },
            { label: "Product Reviews", href: "/reviews", icon: Star, allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT", "PUBLISHER"] },
        ],
    },
    {
        title: "PLATFORM & ACCESS",
        items: [
            { label: "Staff & RBAC", href: "/staff", icon: ShieldCheck, allowedRoles: ["SUPER_ADMIN", "ADMIN"] },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const role = useAppSelector((state) => state.auth.role);

    const filteredGroups = NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
            if (!role || !item.allowedRoles) return true;
            return item.allowedRoles.includes(role);
        }),
    })).filter((group) => group.items.length > 0);

    return (
        <aside
            style={{
                width: "230px",
                minWidth: "230px",
                backgroundColor: "var(--ec-surface, #ffffff)",
                borderRight: "1px solid var(--ec-border, #f1f5f9)",
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
                {filteredGroups.map((group) => (
                    <div key={group.title}>
                        <div
                            style={{
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                color: "var(--ec-text-muted, #94a3b8)",
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
                                            backgroundColor: isActive ? "var(--ec-bg-subtle, #f8fafc)" : "transparent",
                                            color: isActive ? "var(--ec-text-primary, #0f172a)" : "var(--ec-text-secondary, #475569)",
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
                    borderTop: "1px solid var(--ec-border, #f1f5f9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.6875rem",
                    color: "var(--ec-text-muted, #94a3b8)",
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
