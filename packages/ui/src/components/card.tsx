import React from "react";

export function Card({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 shadow-xs overflow-hidden box-border ${className}`}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`p-4 pb-2 flex flex-col gap-1 ${className}`}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={`text-sm font-semibold text-slate-900 dark:text-neutral-100 tracking-tight m-0 ${className}`}
            style={style}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardDescription({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={`text-xs text-slate-500 dark:text-neutral-400 m-0 leading-relaxed ${className}`}
            style={style}
            {...props}
        >
            {children}
        </p>
    );
}

export function CardContent({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`p-4 pt-1 ${className}`}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardFooter({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`p-4 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center ${className}`}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}
