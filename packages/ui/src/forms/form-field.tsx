import React from "react";

export interface FormFieldProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    id?: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export function FormField({
    label,
    error,
    helperText,
    required = false,
    id,
    children,
    className = "",
    style,
}: FormFieldProps) {
    return (
        <div
            className={`ec-form-field ${className}`}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                width: "100%",
                textAlign: "left",
                boxSizing: "border-box",
                ...style,
            }}
        >
            {label && (
                <label
                    htmlFor={id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--ec-text-secondary, #334155)",
                    }}
                >
                    <span>{label}</span>
                    {required && (
                        <span
                            style={{
                                color: "var(--ec-danger, #dc2626)",
                                marginLeft: "0.25rem",
                                fontWeight: 700,
                            }}
                        >
                            *
                        </span>
                    )}
                </label>
            )}

            {children}

            {error ? (
                <p
                    style={{
                        fontSize: "0.75rem",
                        color: "var(--ec-danger, #dc2626)",
                        marginTop: "0.25rem",
                        fontWeight: 500,
                    }}
                >
                    {error}
                </p>
            ) : helperText ? (
                <p
                    style={{
                        fontSize: "0.75rem",
                        color: "var(--ec-text-muted, #64748b)",
                        marginTop: "0.25rem",
                    }}
                >
                    {helperText}
                </p>
            ) : null}
        </div>
    );
}
