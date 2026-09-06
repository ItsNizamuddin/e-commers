import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
    styleType?: "subtle" | "solid" | "outline";
    size?: "sm" | "md";
}

export function Badge({
    children,
    variant = "neutral",
    styleType = "subtle",
    size = "sm",
    className = "",
    ...props
}: BadgeProps) {
    const sizeStyles = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-1",
    };

    const styleMap = {
        subtle: {
            neutral: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
            primary: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
            success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
            warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
            danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
            info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
        },
        solid: {
            neutral: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
            primary: "bg-indigo-600 text-white",
            success: "bg-emerald-600 text-white",
            warning: "bg-amber-600 text-white",
            danger: "bg-rose-600 text-white",
            info: "bg-sky-600 text-white",
        },
        outline: {
            neutral: "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
            primary: "border border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300",
            success: "border border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
            warning: "border border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300",
            danger: "border border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300",
            info: "border border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300",
        },
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]} ${styleMap[styleType][variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
