"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    ChevronDown,
    PlusCircle,
    Clock,
    Truck,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Layers,
    Settings,
    ScrollText,
    LogOut,
    X,
    MapPin,
    Globe,
    FileSpreadsheet,
    Boxes,
    ClipboardList,
    CalendarCheck,
    Cpu,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../../store";
import { clearSession } from "../../store/auth-slice";
import { api, setAccessToken } from "../../lib/api";
import type { UserRole } from "@ecommers/types";

interface SubItem {
    label: string;
    href: string;
    icon?: React.ElementType;
    badge?: string;
    badgeColor?: "amber" | "emerald" | "blue" | "rose";
    allowedRoles?: UserRole[];
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: "amber" | "emerald" | "blue" | "rose";
    allowedRoles?: UserRole[];
    subItems?: SubItem[];
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: "CORE & ANALYTICS",
        items: [
            {
                label: "Dashboard",
                href: "/dashboard",
                icon: LayoutDashboard,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES"],
            },
            {
                label: "Analytics",
                href: "/analytics",
                icon: BarChart3,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES"],
            },
        ],
    },
    {
        title: "COMMERCE & CATALOG",
        items: [
            {
                label: "Orders",
                href: "/orders",
                icon: ShoppingBag,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"],
                subItems: [
                    { label: "All Orders", href: "/orders", icon: ShoppingBag },
                    { label: "Unfulfilled", href: "/orders?fulfillment=UNFULFILLED", icon: Clock },
                    { label: "In Transit", href: "/orders?fulfillment=PROCESSING", icon: Truck },
                    { label: "Completed", href: "/orders?fulfillment=DELIVERED", icon: CheckCircle2 },
                    { label: "Cancelled", href: "/orders?status=CANCELLED", icon: XCircle },
                ],
            },
            {
                label: "Products",
                href: "/products",
                icon: Package,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER", "SALES", "SUPPORT_AGENT"],
                subItems: [
                    { label: "All Products", href: "/products", icon: Package },
                    { label: "Packaging & Pricing", href: "/products/packaging-matrix", icon: Layers },
                    { label: "Add Product", href: "/products/new", icon: PlusCircle },
                ],
            },
            {
                label: "Inventory",
                href: "/inventory",
                icon: Warehouse,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT_AGENT"],
                subItems: [
                    { label: "Stock Ledger", href: "/inventory", icon: Warehouse },
                    { label: "Movements Audit", href: "/inventory?tab=movements", icon: Layers },
                    { label: "Low Stock Alert", href: "/inventory?filter=low-stock", icon: AlertTriangle, badge: "Alert", badgeColor: "amber" },
                ],
            },
            {
                label: "Categories",
                href: "/categories",
                icon: FolderTree,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER"],
            },
            {
                label: "Locations",
                href: "/locations",
                icon: MapPin,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER"],
            },
            {
                label: "SEO Metadata",
                href: "/seo",
                icon: Globe,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER"],
            },
            {
                label: "SEO Bulk Management",
                href: "/seo/bulk",
                icon: FileSpreadsheet,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER"],
            },
        ],
    },
    {
        title: "MANUFACTURING & RECIPES",
        items: [
            {
                label: "Raw Materials",
                href: "/raw-materials",
                icon: Boxes,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
                subItems: [
                    { label: "Material Catalog", href: "/raw-materials", icon: Boxes },
                    { label: "Intake & Purchases", href: "/raw-materials/purchases", icon: Truck },
                    { label: "Vendors & Suppliers", href: "/raw-materials/vendors", icon: Users },
                    { label: "Active Lots & FEFO", href: "/raw-materials/lots", icon: CalendarCheck },
                    { label: "Raw Stock Ledger", href: "/raw-materials/ledger", icon: Layers },
                ],
            },
            {
                label: "Recipes (BOM)",
                href: "/recipes",
                icon: ClipboardList,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
            {
                label: "Production Batches",
                href: "/manufacturing",
                icon: Cpu,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
            {
                label: "Stock Repackaging",
                href: "/manufacturing/repackaging",
                icon: Layers,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
        ],
    },
    {
        title: "CUSTOMERS & COMMUNITY",
        items: [
            {
                label: "Customers",
                href: "/customers",
                icon: Users,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"],
            },
            {
                label: "Reviews & Ratings",
                href: "/reviews",
                icon: Star,
                allowedRoles: ["SUPER_ADMIN", "ADMIN", "PUBLISHER", "SUPPORT_AGENT"],
            },
        ],
    },
    {
        title: "ADMINISTRATION",
        items: [
            {
                label: "Staff & RBAC",
                href: "/staff",
                icon: ShieldCheck,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
            {
                label: "Audit Logs",
                href: "/audit-logs",
                icon: ScrollText,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
            {
                label: "Bulk Operations (Jobs)",
                href: "/jobs",
                icon: Cpu,
                allowedRoles: ["SUPER_ADMIN", "ADMIN"],
            },
            {
                label: "Account",
                href: "/account",
                icon: UserCheck,
            },
        ],
    },
];

function NavBadge({
    text,
    color = "blue",
}: {
    text: string;
    color?: "amber" | "emerald" | "blue" | "rose";
}) {
    const colorClasses = {
        amber: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        emerald: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        blue: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        rose: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    };

    return (
        <span
            className={`text-[9px] font-semibold px-1 py-0.2 rounded-md border leading-none inline-flex items-center ${
                colorClasses[color] || colorClasses.blue
            }`}
        >
            {text}
        </span>
    );
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const role = useAppSelector((state) => state.auth.role);
    const user = useAppSelector((state) => state.auth.user);

    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
    const profilePopupRef = useRef<HTMLDivElement>(null);

    // Track open accordion menus
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const section of NAV_SECTIONS) {
            for (const item of section.items) {
                if (item.subItems && pathname.startsWith(item.href)) {
                    initial[item.href] = true;
                }
            }
        }
        return initial;
    });

    // Auto-expand section if navigating to a child page
    useEffect(() => {
        for (const section of NAV_SECTIONS) {
            for (const item of section.items) {
                if (item.subItems && pathname.startsWith(item.href)) {
                    setOpenSections((prev) => ({ ...prev, [item.href]: true }));
                }
            }
        }
    }, [pathname]);

    // Close popup on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profilePopupRef.current && !profilePopupRef.current.contains(event.target as Node)) {
                setIsProfilePopupOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSection = (href: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [href]: !prev[href],
        }));
    };

    const isSubActive = (subHref: string) => {
        const basePath = subHref.split("?")[0];
        return pathname === basePath;
    };

    const handleLogout = async () => {
        try {
            await api.auth.adminLogout();
        } catch {
            // cleanup regardless
        } finally {
            document.cookie = "admin_session_active=; path=/; max-age=0; SameSite=Lax";
            setAccessToken(null);
            dispatch(clearSession());
            router.replace("/login");
        }
    };

    const filteredSections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items
            .filter((item) => {
                if (!item.allowedRoles) return true;
                if (!role) return false;
                return item.allowedRoles.includes(role);
            })
            .map((item) => ({
                ...item,
                subItems: item.subItems?.filter((sub) => {
                    if (!sub.allowedRoles) return true;
                    if (!role) return false;
                    return sub.allowedRoles.includes(role);
                }),
            })),
    })).filter((section) => section.items.length > 0);

    const displayName = user
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email.split("@")[0]
        : "Administrator";

    const userInitial = displayName[0]?.toUpperCase() || "A";
    const roleBadge = role ? role.replace("_", " ") : "SUPER ADMIN";

    const sidebarContent = (
        <div className="w-56 h-full flex flex-col bg-white dark:bg-[#0a0a0a] border-r border-slate-200/80 dark:border-neutral-800 select-none">
            {/* Header: h-14 with brand */}
            <div className="h-14 border-b border-slate-200/80 dark:border-neutral-800 flex items-center justify-between px-3.5 shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                        E
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
                            ecommers
                        </span>
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                            ADMIN
                        </span>
                    </div>
                </Link>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="md:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-md cursor-pointer"
                        aria-label="Close sidebar"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>

            {/* Scrollable Navigation Tree */}
            <div className="flex-1 px-2 py-3 overflow-y-auto flex flex-col gap-4">
                {filteredSections.map((section) => (
                    <div key={section.title}>
                        <div className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-neutral-500 px-2 pb-1.5 uppercase">
                            {section.title}
                        </div>

                        <div className="flex flex-col gap-0.5">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isParentActive =
                                    item.href === "/seo"
                                        ? pathname === "/seo" || pathname.startsWith("/seo/edit")
                                        : item.href === "/dashboard" || item.href === "/account"
                                            ? pathname === item.href
                                            : pathname.startsWith(item.href);

                                const hasSub = Boolean(item.subItems && item.subItems.length > 0);
                                const isOpenSection = Boolean(openSections[item.href]);

                                return (
                                    <div key={item.href} className="relative">
                                        {/* Main item row */}
                                        <div
                                            className={`flex items-center rounded-md transition-colors relative ${
                                                isParentActive
                                                    ? "bg-gray-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-medium"
                                                    : "text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:text-slate-900 dark:hover:text-white font-normal"
                                            }`}
                                        >
                                            <Link
                                                href={item.href}
                                                onClick={onClose}
                                                className="flex items-center flex-1 px-2.5 py-1.5 text-[13px] gap-2.5 min-w-0"
                                            >
                                                <Icon
                                                    size={16}
                                                    className={`shrink-0 transition-colors ${
                                                        isParentActive
                                                            ? "text-blue-600 dark:text-blue-400"
                                                            : "text-slate-400 dark:text-neutral-500"
                                                    }`}
                                                    strokeWidth={isParentActive ? 2.2 : 1.8}
                                                />
                                                <span className="truncate flex-1">
                                                    {item.label}
                                                </span>

                                                {item.badge && (
                                                    <NavBadge text={item.badge} color={item.badgeColor} />
                                                )}
                                            </Link>

                                            {/* Expand/Collapse Toggle */}
                                            {hasSub && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleSection(item.href);
                                                    }}
                                                    aria-label={`Toggle ${item.label} submenu`}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 rounded-r-md transition-transform cursor-pointer"
                                                >
                                                    <ChevronDown
                                                        size={13}
                                                        className={`transition-transform duration-150 ${
                                                            isOpenSection ? "rotate-180" : ""
                                                        }`}
                                                    />
                                                </button>
                                            )}
                                        </div>

                                        {/* Sub-menu tree */}
                                        {hasSub && isOpenSection && (
                                            <div className="ml-4 pl-2 border-l border-slate-200/80 dark:border-neutral-800 my-0.5 flex flex-col gap-0.5">
                                                {item.subItems!.map((sub) => {
                                                    const activeSub = isSubActive(sub.href);
                                                    const SubIcon = sub.icon;

                                                    return (
                                                        <Link
                                                            key={sub.href}
                                                            href={sub.href}
                                                            onClick={onClose}
                                                            className={`flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors ${
                                                                activeSub
                                                                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 font-medium"
                                                                    : "text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800/50 hover:text-slate-900 dark:hover:text-white"
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                {SubIcon ? (
                                                                    <SubIcon
                                                                        size={13}
                                                                        className={activeSub ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-neutral-500"}
                                                                    />
                                                                ) : (
                                                                    <span
                                                                        className={`w-1 h-1 rounded-full ${
                                                                            activeSub ? "bg-blue-600" : "bg-slate-300 dark:bg-neutral-600"
                                                                        }`}
                                                                    />
                                                                )}
                                                                <span className="truncate text-[12px]">
                                                                    {sub.label}
                                                                </span>
                                                            </div>

                                                            {sub.badge && (
                                                                <NavBadge text={sub.badge} color={sub.badgeColor} />
                                                            )}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Profile & System Status Card */}
            <div ref={profilePopupRef} className="p-2 border-t border-slate-200/80 dark:border-neutral-800 relative">
                {/* User Row Trigger */}
                <div
                    onClick={() => setIsProfilePopupOpen(!isProfilePopupOpen)}
                    className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Compact rounded square avatar: w-6 h-6 rounded-md */}
                        <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                            {userInitial}
                        </div>
                        <div className="min-w-0 leading-tight">
                            <div className="text-xs font-semibold text-slate-900 dark:text-neutral-100 truncate">
                                {displayName}
                            </div>
                            <div className="text-[9px] font-medium text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                                {roleBadge}
                            </div>
                        </div>
                    </div>

                    <Settings size={13} className="text-slate-400 dark:text-neutral-500 shrink-0" />
                </div>

                {/* Popup menu opening to right and upwards: absolute left-full bottom-0 ml-3 w-48 */}
                {isProfilePopupOpen && (
                    <div className="absolute left-full bottom-2 ml-3 w-48 bg-white dark:bg-[#111111] rounded-xl border border-slate-200/80 dark:border-neutral-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2 py-1.5 border-b border-slate-100 dark:border-neutral-800 mb-1">
                            <div className="text-[13px] font-semibold text-slate-900 dark:text-neutral-100 truncate">
                                {displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                                {user?.email || "admin@ecommers.local"}
                            </div>
                        </div>

                        <Link
                            href="/account"
                            onClick={() => {
                                setIsProfilePopupOpen(false);
                                onClose?.();
                            }}
                            className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-slate-700 dark:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                        >
                            <Settings size={14} className="text-slate-400 dark:text-neutral-500" />
                            <span>Account Settings</span>
                        </Link>

                        <div className="h-px bg-slate-100 dark:bg-neutral-800 my-1" />

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                        >
                            <LogOut size={14} className="shrink-0" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Fixed Sidebar: w-56, fixed left-0, hidden on md:flex */}
            <aside className="w-56 fixed left-0 top-0 bottom-0 z-30 hidden md:flex flex-col">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer with Backdrop */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                        onClick={onClose}
                    />
                    <aside className="relative z-10 w-56 h-full flex flex-col shadow-2xl">
                        {sidebarContent}
                    </aside>
                </div>
            )}
        </>
    );
}
