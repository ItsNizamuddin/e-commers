"use client";

import React, { useState } from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";

interface AdminShellProps {
    children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-slate-900 dark:text-neutral-100 transition-colors duration-200 flex flex-col">
            {/* Unified Fixed Sidebar (Desktop w-56, Mobile Drawer) */}
            <Sidebar
                isOpen={isMobileNavOpen}
                onClose={() => setIsMobileNavOpen(false)}
            />

            {/* Main Application Area with fixed sidebar margin (md:ml-56) */}
            <div className="md:ml-56 flex-1 flex flex-col min-h-screen">
                {/* Minimal Header (h-14) */}
                <Topbar onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)} />

                {/* Main Content Area - Strictly constrained to max-w-6xl with equal side gaps and vertical spacing */}
                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
