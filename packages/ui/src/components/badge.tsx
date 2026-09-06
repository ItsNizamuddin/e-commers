import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
    styleType?: "subtle" | "solid" | "outline";
    size?: "sm" | "md";
}

const sizeStyles = {
    sm: {
        fontSize: "0.6875rem",
        padding: "0.125rem 0.5rem",
        height: "20px",
    },
    md: {
        fontSize: "0.75rem",
        padding: "0.25rem 0.625rem",
        height: "24px",
    },
};

const subtleStyles = {
    neutral: {
        backgroundColor: "var(--ec-bg-subtle, #f1f5f9)",
        color: "var(--ec-text-secondary, #334155)",
        border: "1px solid var(--ec-border, #e2e8f0)",
    },
    primary: {
        backgroundColor: "var(--ec-primary-50, #eff6ff)",
        color: "var(--ec-primary-700, #1d4ed8)",
        border: "1px solid var(--ec-primary-100, #dbeafe)",
    },
    success: {
        backgroundColor: "var(--ec-success-bg, #ecfdf5)",
        color: "var(--ec-success, #059669)",
        border: "1px solid var(--ec-success-border, #a7f3d0)",
    },
    warning: {
        backgroundColor: "var(--ec-warning-bg, #fffbeb)",
        color: "var(--ec-warning, #d97706)",
        border: "1px solid var(--ec-warning-border, #fde68a)",
    },
    danger: {
        backgroundColor: "var(--ec-danger-bg, #fef2f2)",
        color: "var(--ec-danger, #dc2626)",
        border: "1px solid var(--ec-danger-border, #fecaca)",
    },
    info: {
        backgroundColor: "var(--ec-info-bg, #f0f9ff)",
        color: "var(--ec-info, #0284c7)",
        border: "1px solid var(--ec-info-border, #bae6fd)",
    },
};

const solidStyles = {
    neutral: {
        backgroundColor: "var(--ec-text-primary, #0f172a)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
    primary: {
        backgroundColor: "var(--ec-primary-600, #2563eb)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
    success: {
        backgroundColor: "var(--ec-success, #059669)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
    warning: {
        backgroundColor: "var(--ec-warning, #d97706)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
    danger: {
        backgroundColor: "var(--ec-danger, #dc2626)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
    info: {
        backgroundColor: "var(--ec-info, #0284c7)",
        color: "#ffffff",
        border: "1px solid transparent",
    },
};

const outlineStyles = {
    neutral: {
        backgroundColor: "transparent",
        color: "var(--ec-text-secondary, #334155)",
        border: "1px solid var(--ec-border-strong, #cbd5e1)",
    },
    primary: {
        backgroundColor: "transparent",
        color: "var(--ec-primary-600, #2563eb)",
        border: "1px solid var(--ec-primary-300, #93c5fd)",
    },
    success: {
        backgroundColor: "transparent",
        color: "var(--ec-success, #059669)",
        border: "1px solid var(--ec-success-border, #a7f3d0)",
    },
    warning: {
        backgroundColor: "transparent",
        color: "var(--ec-warning, #d97706)",
        border: "1px solid var(--ec-warning-border, #fde68a)",
    },
    danger: {
        backgroundColor: "transparent",
        color: "var(--ec-danger, #dc2626)",
        border: "1px solid var(--ec-danger-border, #fecaca)",
    },
    info: {
        backgroundColor: "transparent",
        color: "var(--ec-info, #0284c7)",
        border: "1px solid var(--ec-info-border, #bae6fd)",
    },
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
    const sz = sizeStyles[size];
    const palette =
        styleType === "solid"
            ? solidStyles[variant]
            : styleType === "outline"
            ? outlineStyles[variant]
            : subtleStyles[variant];

    return (
        <span
            className={`ec-badge ${className}`}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                borderRadius: "9999px",
                whiteSpace: "nowrap",
                lineHeight: 1,
                boxSizing: "border-box",
                ...sz,
                ...palette,
                ...style,
            }}
            {...props}
        >
            {children}
        </span>
    );
}
