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
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { toggleSidebar } from "../../store/ui-slice";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/orders", icon: ShoppingBag },
    { label: "Products", href: "/products", icon: Package },
    { label: "Categories", href: "/categories", icon: FolderTree },
    { label: "Inventory", href: "/inventory", icon: Warehouse },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Reviews", href: "/reviews", icon: Star },
    { label: "Staff & RBAC", href: "/staff", icon: ShieldCheck },
];

export function Sidebar() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

    return (
        <aside
            style={{
                width: collapsed ? "72px" : "240px",
                minWidth: collapsed ? "72px" : "240px",
                transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                backgroundColor: "#0f172a",
                color: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #1e293b",
                height: "100vh",
                position: "sticky",
                top: 0,
                zIndex: 40,
            }}
        >
            {/* Header / Brand */}
            <div
                style={{
                    height: "64px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    padding: collapsed ? "0" : "0 1.25rem",
                    borderBottom: "1px solid #1e293b",
                }}
            >
                {!collapsed && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div
                            style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                backgroundColor: "#3b82f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.875rem",
                            }}
                        >
                            E
                        </div>
                        <span
                            style={{
                                fontSize: "1rem",
                                fontWeight: 700,
                                letterSpacing: "-0.025em",
                                color: "#f8fafc",
                            }}
                        >
                            ecommers <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.75rem" }}>ADMIN</span>
                        </span>
                    </div>
                )}
                {collapsed && (
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                        }}
                    >
                        E
                    </div>
                )}
            </div>

            {/* Navigation Links */}
            <nav
                style={{
                    flex: 1,
                    padding: "1rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    overflowY: "auto",
                }}
            >
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: collapsed ? "0.625rem 0" : "0.625rem 0.875rem",
                                justifyContent: collapsed ? "center" : "flex-start",
                                borderRadius: "6px",
                                color: isActive ? "#ffffff" : "#94a3b8",
                                backgroundColor: isActive ? "#1e293b" : "transparent",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                fontWeight: isActive ? 600 : 500,
                                transition: "all 0.15s ease",
                            }}
                        >
                            <Icon size={18} color={isActive ? "#3b82f6" : "#94a3b8"} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Toggle Button */}
            <div
                style={{
                    padding: "0.75rem",
                    borderTop: "1px solid #1e293b",
                    display: "flex",
                    justifyContent: collapsed ? "center" : "flex-end",
                }}
            >
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    style={{
                        background: "transparent",
                        border: "1px solid #334155",
                        color: "#94a3b8",
                        borderRadius: "6px",
                        padding: "0.375rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>
        </aside>
    );
}
