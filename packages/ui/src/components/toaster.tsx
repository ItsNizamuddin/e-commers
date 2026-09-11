"use client";

import React, { useSyncExternalStore } from "react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastData {
    id: string;
    title?: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
    createdAt: number;
}

export interface ToastOptions {
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

type ToastListener = () => void;

class ToastStore {
    private toasts: ToastData[] = [];
    private listeners: Set<ToastListener> = new Set();
    private count = 0;

    subscribe = (listener: ToastListener): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    getSnapshot = (): ToastData[] => {
        return this.toasts;
    };

    private notify() {
        this.listeners.forEach((l) => l());
    }

    add(titleOrOptions: string | ({ title?: string } & ToastOptions), options?: ToastOptions): string {
        const id = `toast-${++this.count}-${Date.now()}`;
        let title: string | undefined;
        let opts: ToastOptions = {};

        if (typeof titleOrOptions === "string") {
            title = titleOrOptions;
            opts = options || {};
        } else {
            title = titleOrOptions.title;
            opts = titleOrOptions;
        }

        const newToast: ToastData = {
            id,
            title,
            description: opts.description,
            variant: opts.variant || "default",
            duration: opts.duration ?? 3500,
            createdAt: Date.now(),
        };

        // Prepend new toast, keep at most 5 visible toasts to avoid overwhelming screen
        this.toasts = [newToast, ...this.toasts.slice(0, 4)];
        this.notify();

        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, newToast.duration);
        }

        return id;
    }

    dismiss = (id?: string) => {
        if (id) {
            this.toasts = this.toasts.filter((t) => t.id !== id);
        } else {
            this.toasts = [];
        }
        this.notify();
    };
}

const toastStore = new ToastStore();

export interface ToastFunction {
    (title: string, options?: ToastOptions): string;
    (data: { title?: string } & ToastOptions): string;
    success: (title: string, options?: Omit<ToastOptions, "variant">) => string;
    error: (title: string, options?: Omit<ToastOptions, "variant">) => string;
    warning: (title: string, options?: Omit<ToastOptions, "variant">) => string;
    info: (title: string, options?: Omit<ToastOptions, "variant">) => string;
    dismiss: (id?: string) => void;
}

export const toast: ToastFunction = Object.assign(
    (titleOrData: string | ({ title?: string } & ToastOptions), options?: ToastOptions) => {
        return toastStore.add(titleOrData, options);
    },
    {
        success: (title: string, options?: Omit<ToastOptions, "variant">) => {
            return toastStore.add(title, { ...options, variant: "success" });
        },
        error: (title: string, options?: Omit<ToastOptions, "variant">) => {
            return toastStore.add(title, { ...options, variant: "error" });
        },
        warning: (title: string, options?: Omit<ToastOptions, "variant">) => {
            return toastStore.add(title, { ...options, variant: "warning" });
        },
        info: (title: string, options?: Omit<ToastOptions, "variant">) => {
            return toastStore.add(title, { ...options, variant: "info" });
        },
        dismiss: (id?: string) => {
            toastStore.dismiss(id);
        },
    }
);

const EMPTY_TOASTS: ToastData[] = [];
const getEmptyToasts = () => EMPTY_TOASTS;

export function useToasts(): ToastData[] {
    return useSyncExternalStore(
        toastStore.subscribe,
        toastStore.getSnapshot,
        getEmptyToasts
    );
}

// Crisp inline SVGs to keep @ecommers/ui zero-dependency
function SuccessIcon() {
    return (
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v.01M12 11v5" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

export interface ToasterProps {
    position?: "top-right" | "top-center" | "top-left" | "bottom-right" | "bottom-center" | "bottom-left";
    className?: string;
}

export const Toaster: React.FC<ToasterProps> = ({
    position = "top-right",
    className = "",
}) => {
    const toasts = useToasts();

    if (toasts.length === 0) return null;

    // Top positions start below the 56px (h-14) navbar at 64px (top-16 / 4rem)
    const positionClasses: Record<string, string> = {
        "top-right": "top-16 right-4 sm:right-6 items-end",
        "top-center": "top-16 left-1/2 -translate-x-1/2 items-center",
        "top-left": "top-16 left-4 sm:left-6 items-start",
        "bottom-right": "bottom-5 right-4 sm:right-6 items-end",
        "bottom-left": "bottom-5 left-4 sm:left-6 items-start",
        "bottom-center": "bottom-5 left-1/2 -translate-x-1/2 items-center",
    };

    const isTop = position.startsWith("top");
    const animationClass = isTop
        ? "animate-in fade-in slide-in-from-top-2 duration-200"
        : "animate-in fade-in slide-in-from-bottom-2 duration-200";

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className={`fixed z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none ${positionClasses[position] || positionClasses["top-right"]} ${className}`}
        >
            {toasts.map((t) => {
                let icon = null;
                let borderStyle = "border-slate-200 dark:border-neutral-800";
                let accentBg = "bg-white/95 dark:bg-neutral-900/95";

                if (t.variant === "success") {
                    icon = <SuccessIcon />;
                    borderStyle = "border-emerald-200 dark:border-emerald-800/60";
                    accentBg = "bg-white/95 dark:bg-neutral-900/95";
                } else if (t.variant === "error") {
                    icon = <ErrorIcon />;
                    borderStyle = "border-rose-200 dark:border-rose-800/60";
                    accentBg = "bg-white/95 dark:bg-neutral-900/95";
                } else if (t.variant === "warning") {
                    icon = <WarningIcon />;
                    borderStyle = "border-amber-200 dark:border-amber-800/60";
                    accentBg = "bg-white/95 dark:bg-neutral-900/95";
                } else if (t.variant === "info") {
                    icon = <InfoIcon />;
                    borderStyle = "border-sky-200 dark:border-sky-800/60";
                    accentBg = "bg-white/95 dark:bg-neutral-900/95";
                }

                return (
                    <div
                        key={t.id}
                        role="alert"
                        className={`pointer-events-auto w-full flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all ${animationClass} ${borderStyle} ${accentBg} text-slate-900 dark:text-neutral-100`}
                    >
                        {icon && <div className="mt-0.5">{icon}</div>}
                        <div className="flex-1 min-w-0">
                            {t.title && (
                                <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-neutral-100">
                                    {t.title}
                                </p>
                            )}
                            {t.description && (
                                <p className="text-[11px] leading-normal text-slate-500 dark:text-neutral-400 mt-1">
                                    {t.description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => toast.dismiss(t.id)}
                            aria-label="Close notification"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-0.5 rounded transition-colors -mr-1 -mt-0.5 cursor-pointer"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
