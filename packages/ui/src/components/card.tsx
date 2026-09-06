import React from "react";

export function Card({
    className = "",
    children,
    style,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`ec-card ${className}`}
            style={{
                backgroundColor: "var(--ec-surface, #ffffff)",
                border: "1px solid var(--ec-border, #e2e8f0)",
                borderRadius: "var(--ec-radius-xl, 16px)",
                boxShadow: "var(--ec-shadow-card, 0 4px 6px -1px rgba(0, 0, 0, 0.05))",
                color: "var(--ec-text-primary, #0f172a)",
                overflow: "hidden",
                boxSizing: "border-box",
                ...style,
            }}
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
            className={`ec-card-header ${className}`}
            style={{
                padding: "1.5rem 1.5rem 1rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                ...style,
            }}
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
            className={`ec-card-title ${className}`}
            style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--ec-text-primary, #0f172a)",
                letterSpacing: "-0.01em",
                margin: 0,
                ...style,
            }}
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
            className={`ec-card-description ${className}`}
            style={{
                fontSize: "0.8125rem",
                color: "var(--ec-text-muted, #64748b)",
                margin: 0,
                lineHeight: 1.4,
                ...style,
            }}
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
            className={`ec-card-content ${className}`}
            style={{
                padding: "1.5rem",
                boxSizing: "border-box",
                ...style,
            }}
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
            className={`ec-card-footer ${className}`}
            style={{
                padding: "1rem 1.5rem 1.5rem 1.5rem",
                borderTop: "1px solid var(--ec-border, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
}
