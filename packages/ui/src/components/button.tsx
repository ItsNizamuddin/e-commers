import React from "react";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const sizeStyles = {
    sm: {
        height: "32px",
        padding: "0 0.75rem",
        fontSize: "0.75rem",
        gap: "0.375rem",
        borderRadius: "6px",
    },
    md: {
        height: "38px",
        padding: "0 1rem",
        fontSize: "0.875rem",
        gap: "0.5rem",
        borderRadius: "8px",
    },
    lg: {
        height: "44px",
        padding: "0 1.25rem",
        fontSize: "0.9375rem",
        gap: "0.5rem",
        borderRadius: "8px",
    },
};

const variantStyles = {
    primary: {
        backgroundColor: "var(--ec-primary-600, #2563eb)",
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: "0 1px 2px 0 rgba(37, 99, 235, 0.2)",
    },
    secondary: {
        backgroundColor: "var(--ec-bg-subtle, #f1f5f9)",
        color: "var(--ec-text-primary, #0f172a)",
        border: "1px solid var(--ec-border, #e2e8f0)",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
    },
    outline: {
        backgroundColor: "transparent",
        color: "var(--ec-text-secondary, #334155)",
        border: "1px solid var(--ec-border-strong, #cbd5e1)",
    },
    ghost: {
        backgroundColor: "transparent",
        color: "var(--ec-text-secondary, #334155)",
        border: "1px solid transparent",
    },
    danger: {
        backgroundColor: "var(--ec-danger, #dc2626)",
        color: "#ffffff",
        border: "1px solid transparent",
        boxShadow: "0 1px 2px 0 rgba(220, 38, 38, 0.2)",
    },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = "primary",
            size = "md",
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            className = "",
            style,
            type = "button",
            ...props
        },
        ref
    ) => {
        const sz = sizeStyles[size];
        const vr = variantStyles[variant];
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                type={type}
                disabled={isDisabled}
                className={`ec-button ${className}`}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.75 : 1,
                    transition: "var(--ec-transition, all 0.15s cubic-bezier(0.4, 0, 0.2, 1))",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                    ...sz,
                    ...vr,
                    ...style,
                }}
                {...props}
            >
                {isLoading ? (
                    <Spinner size={size === "lg" ? "md" : "sm"} />
                ) : (
                    leftIcon
                )}
                {children && <span>{children}</span>}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = "Button";
