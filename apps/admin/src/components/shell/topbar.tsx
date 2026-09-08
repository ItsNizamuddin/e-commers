"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    LogOut,
    Sun,
    Moon,
    Bell,
    ChevronRight,
    Loader2,
    User as UserIcon,
    ShieldCheck,
    Menu,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearSession } from "../../store/auth-slice";
import { api, setAccessToken } from "../../lib/api";
import { useTheme } from "../theme-provider";

interface TopbarProps {
    onToggleMobileNav?: () => void;
}

export function Topbar({ onToggleMobileNav }: TopbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const { theme, toggleTheme } = useTheme();
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await api.auth.adminLogout();
        } catch {
            // Even if network fails, proceed with client cleanup
        } finally {
            document.cookie = "admin_session_active=; path=/; max-age=0; SameSite=Lax";
            setAccessToken(null);
            dispatch(clearSession());
            router.replace("/login");
        }
    };

    const initial = user?.firstName?.[0]?.toUpperCase() || "A";
    const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0]
        : "Administrator";

    // Format breadcrumb path
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs = pathSegments.map((segment) =>
        segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );

    return (
        <header className="h-14 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 transition-colors duration-200">
            {/* Left: Hamburger (Mobile) + Breadcrumb Navigation */}
            <div className="flex items-center gap-2.5">
                {/* Mobile Hamburger Drawer Trigger */}
                <button
                    type="button"
                    onClick={onToggleMobileNav}
                    className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                    aria-label="Open sidebar menu"
                >
                    <Menu size={16} />
                </button>

                {/* Minimal Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
                    <span className="font-medium text-slate-400 dark:text-neutral-500">Portal</span>
                    {breadcrumbs.length > 0 ? (
                        breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb}>
                                <ChevronRight size={12} className="text-slate-300 dark:text-neutral-600" />
                                <span
                                    className={
                                        idx === breadcrumbs.length - 1
                                            ? "font-semibold text-slate-900 dark:text-neutral-100"
                                            : "font-normal hover:text-slate-700 dark:hover:text-neutral-300"
                                    }
                                >
                                    {crumb}
                                </span>
                            </React.Fragment>
                        ))
                    ) : (
                        <>
                            <ChevronRight size={12} className="text-slate-300 dark:text-neutral-600" />
                            <span className="font-semibold text-slate-900 dark:text-neutral-100">Overview</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Theme Toggle Switch, Notifications, User Chip */}
            <div className="flex items-center gap-2.5">
                {/* Custom Tailwind Switch Theme Toggle */}
                <button
                    type="button"
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === "dark"}
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 p-0.5 transition-colors duration-200 focus:outline-none"
                >
                    <span
                        className={`pointer-events-none flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-xs ring-0 transition-transform duration-200 ease-in-out ${
                            theme === "dark" ? "translate-x-4 text-amber-400" : "translate-x-0 text-slate-500"
                        }`}
                    >
                        {theme === "dark" ? <Sun size={11} strokeWidth={2.2} /> : <Moon size={11} strokeWidth={2.2} />}
                    </span>
                </button>

                {/* Notifications Bell */}
                <button
                    type="button"
                    title="Notifications"
                    className="relative w-7 h-7 rounded-md text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                    <Bell size={14} />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
                </button>

                {/* User Profile Trigger - Compact rounded square (w-6 h-6 rounded-md) */}
                <div ref={dropdownRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-label="User menu"
                        className="w-6 h-6 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                        {initial}
                    </button>

                    {/* Compact Dropdown Menu - w-48, p-1.5, text-[13px] */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-white dark:bg-[#111111] rounded-xl border border-slate-200/80 dark:border-neutral-800 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            {/* User Header */}
                            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-neutral-800 mb-1">
                                <div className="text-[13px] font-semibold text-slate-900 dark:text-neutral-100 truncate">
                                    {displayName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                                    {user?.email || "admin@ecommers.local"}
                                </div>
                            </div>

                            {/* Menu Items */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    router.push("/account");
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-slate-700 dark:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                            >
                                <UserIcon size={14} className="text-slate-400 dark:text-neutral-500 shrink-0" />
                                <span>Account Settings</span>
                            </button>

                            {(role === "SUPER_ADMIN" || role === "ADMIN") && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        router.push("/staff");
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-slate-700 dark:text-neutral-200 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                                >
                                    <ShieldCheck size={14} className="text-slate-400 dark:text-neutral-500 shrink-0" />
                                    <span>Staff & Access</span>
                                </button>
                            )}

                            <div className="h-px bg-slate-100 dark:bg-neutral-800 my-1" />

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                            >
                                {isLoggingOut ? <Loader2 size={14} className="animate-spin shrink-0" /> : <LogOut size={14} className="shrink-0" />}
                                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
