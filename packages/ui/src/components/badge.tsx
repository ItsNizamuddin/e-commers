import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
    styleType?: "subtle" | "solid" | "outline";
    size?: "sm" | "md";
}

const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 h-4.5 leading-none",
    md: "text-[11px] px-2 py-0.5 h-5 leading-none",
};

const subtleClasses = {
    neutral: "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700",
    primary: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    success: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    danger: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
    info: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
};

const solidClasses = {
    neutral: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-transparent",
    primary: "bg-blue-600 text-white border border-transparent",
    success: "bg-emerald-600 text-white border border-transparent",
    warning: "bg-amber-600 text-white border border-transparent",
    danger: "bg-red-600 text-white border border-transparent",
    info: "bg-sky-600 text-white border border-transparent",
};

const outlineClasses = {
    neutral: "bg-transparent text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-700",
    primary: "bg-transparent text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700",
    success: "bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700",
    warning: "bg-transparent text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700",
    danger: "bg-transparent text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700",
    info: "bg-transparent text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700",
};

export function Badge({
    children,
    variant = "neutral",
    styleType = "subtle",
    size = "sm",
    className = "",
    style,
    ...props
}: BadgeProps) {
    const paletteClass =
        styleType === "solid"
            ? solidClasses[variant]
            : styleType === "outline"
            ? outlineClasses[variant]
            : subtleClasses[variant];

    return (
        <span
            className={`inline-flex items-center justify-center font-medium rounded-md whitespace-nowrap transition-colors ${sizeClasses[size]} ${paletteClass} ${className}`}
            style={style}
            {...props}
        >
            {children}
        </span>
    );
}
