"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    User,
    Lock,
    Radio,
    Mail,
    ChevronRight,
    ShoppingBag,
    Package,
    FolderTree,
    Warehouse,
    Users,
    Star,
    Shield,
    Layers,
    Clock,
    Truck,
    CheckCircle2,
    XCircle,
    PlusCircle,
    AlertTriangle,
} from "lucide-react";
import { useAppSelector } from "../../store";

interface ContextSubItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

export function ContextSidebar() {
    const pathname = usePathname();
    const user = useAppSelector((state) => state.auth.user);

    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Nizam";
    const initial = userName[0]?.toUpperCase() || "N";

    // Determine sub-navigation based on active section
    let subItems: ContextSubItem[] = [];

    if (pathname.startsWith("/orders")) {
        subItems = [
            { label: "All Orders", href: "/orders", icon: ShoppingBag },
            { label: "Unfulfilled", href: "/orders?fulfillment=UNFULFILLED", icon: Clock },
            { label: "Processing & In Transit", href: "/orders?fulfillment=PROCESSING", icon: Truck },
            { label: "Completed Orders", href: "/orders?fulfillment=DELIVERED", icon: CheckCircle2 },
            { label: "Cancelled & Refunds", href: "/orders?status=CANCELLED", icon: XCircle },
        ];
    } else if (pathname.startsWith("/products")) {
        subItems = [
            { label: "Catalog Overview", href: "/products", icon: Package },
            { label: "Add New Product", href: "/products/new", icon: PlusCircle },
            { label: "Category Tree", href: "/categories", icon: FolderTree },
        ];
    } else if (pathname.startsWith("/inventory")) {
        subItems = [
            { label: "Stock Matrix", href: "/inventory", icon: Warehouse },
            { label: "Movements Audit Ledger", href: "/inventory?tab=movements", icon: Layers },
            { label: "Low Stock Attention", href: "/inventory?filter=low-stock", icon: AlertTriangle },
        ];
    } else if (pathname.startsWith("/customers")) {
        subItems = [
            { label: "Customer Accounts", href: "/customers", icon: Users },
            { label: "High Spend (LTV)", href: "/customers?sortBy=spend", icon: Star },
        ];
    } else if (pathname.startsWith("/staff")) {
        subItems = [
            { label: "Staff Members", href: "/staff", icon: Shield },
            { label: "Account Settings", href: "/account", icon: User },
        ];
    } else if (pathname.startsWith("/reviews")) {
        subItems = [
            { label: "Reviews Moderation", href: "/reviews", icon: Star },
            { label: "Product Catalog", href: "/products", icon: Package },
        ];
    } else if (pathname.startsWith("/analytics") || pathname.startsWith("/dashboard")) {
        subItems = [
            { label: "Executive Dashboard", href: "/dashboard", icon: Layers },
            { label: "Sales Analytics", href: "/analytics", icon: Star },
        ];
    } else {
        // Default to Account Context
        subItems = [
            { label: "My details", href: "/account", icon: User },
            { label: "Staff & RBAC", href: "/staff", icon: Shield },
        ];
    }

    return (
        <div
            style={{
                width: "220px",
                minWidth: "220px",
                backgroundColor: "var(--ec-surface, #ffffff)",
                borderRight: "1px solid var(--ec-border, #f1f5f9)",
                height: "calc(100vh - 64px)",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: "64px",
                zIndex: 20,
                padding: "1rem",
                gap: "1.25rem",
            }}
        >
            {/* Authenticated As User Card */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--ec-bg-subtle, #f8fafc)",
                    border: "1px solid var(--ec-border, #e2e8f0)",
                    borderRadius: "12px",
                }}
            >
                <div
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundColor: "#dbeafe",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: 700,
                    }}
                >
                    {initial}
                </div>
                <div style={{ lineHeight: 1.2 }}>
                    <div
                        style={{
                            fontSize: "0.6875rem",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            color: "var(--ec-text-muted, #64748b)",
                            textTransform: "uppercase",
                        }}
                    >
                        AUTHENTICATED AS
                    </div>
                    <div
                        style={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "var(--ec-text-primary, #0f172a)",
                            marginTop: "2px",
                        }}
                    >
                        {userName}
                    </div>
                </div>
            </div>

            {/* Sub-Navigation Links */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {subItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href.includes("?") && false);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.5625rem 0.75rem",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "0.8125rem",
                                fontWeight: isActive ? 600 : 500,
                                backgroundColor: isActive ? "rgba(37, 99, 235, 0.1)" : "transparent",
                                color: isActive ? "var(--ec-primary, #2563eb)" : "var(--ec-text-secondary, #475569)",
                                transition: "all 0.15s ease",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                <Icon size={16} color={isActive ? "#2563eb" : "var(--ec-text-muted, #64748b)"} />
                                <span>{item.label}</span>
                            </div>
                            {isActive && <ChevronRight size={14} color="#2563eb" />}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
