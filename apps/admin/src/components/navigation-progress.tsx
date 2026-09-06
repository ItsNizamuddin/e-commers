"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Reset progress on route change
    useEffect(() => {
        setIsNavigating(false);
        setProgress(100);
        const timer = setTimeout(() => {
            setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    // Listen to link clicks globally to immediately trigger loading feedback
    useEffect(() => {
        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const anchor = target.closest("a");

            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || anchor.target === "_blank") {
                return;
            }

            const currentUrl = window.location.pathname + window.location.search;
            if (href !== currentUrl) {
                setIsNavigating(true);
                setProgress(30);

                const t1 = setTimeout(() => setProgress(65), 150);
                const t2 = setTimeout(() => setProgress(85), 400);

                return () => {
                    clearTimeout(t1);
                    clearTimeout(t2);
                };
            }
        };

        document.addEventListener("click", handleAnchorClick, { capture: true });
        return () => {
            document.removeEventListener("click", handleAnchorClick, { capture: true });
        };
    }, []);

    if (!isNavigating && progress === 0) return null;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                zIndex: 99999,
                pointerEvents: "none",
                backgroundColor: "rgba(37, 99, 235, 0.15)",
            }}
        >
            <div
                style={{
                    height: "100%",
                    width: `${progress}%`,
                    backgroundColor: "#2563eb",
                    boxShadow: "0 0 10px #3b82f6, 0 0 5px #2563eb",
                    transition: progress === 100 ? "width 0.2s ease-out, opacity 0.3s ease" : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: progress === 100 ? 0 : 1,
                }}
            />
        </div>
    );
}
