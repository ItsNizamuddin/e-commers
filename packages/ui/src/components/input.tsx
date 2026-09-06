import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            helperText,
            leadingIcon,
            trailingIcon,
            id,
            className = "",
            disabled,
            style,
            onFocus,
            onBlur,
            ...props
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = React.useState(false);
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div
                className={`ec-input-group ${className}`}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    textAlign: "left",
                    boxSizing: "border-box",
                }}
            >
                {label && (
                    <label
                        htmlFor={inputId}
                        style={{
                            display: "block",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--ec-text-secondary, #334155)",
                            marginBottom: "0.375rem",
                        }}
                    >
                        {label}
                    </label>
                )}

                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    {leadingIcon && (
                        <div
                            style={{
                                position: "absolute",
                                left: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "none",
                                color: isFocused
                                    ? "var(--ec-primary-600, #2563eb)"
                                    : "var(--ec-text-subtle, #94a3b8)",
                                transition: "color 0.15s ease",
                                zIndex: 1,
                            }}
                        >
                            {leadingIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        onFocus={(e) => {
                            setIsFocused(true);
                            onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setIsFocused(false);
                            onBlur?.(e);
                        }}
                        style={{
                            width: "100%",
                            height: "42px",
                            boxSizing: "border-box",
                            padding: "0 0.875rem",
                            paddingLeft: leadingIcon ? "2.375rem" : "0.875rem",
                            paddingRight: trailingIcon ? "2.375rem" : "0.875rem",
                            backgroundColor: disabled
                                ? "var(--ec-bg-subtle, #f1f5f9)"
                                : "var(--ec-surface, #ffffff)",
                            color: "var(--ec-text-primary, #0f172a)",
                            borderRadius: "var(--ec-radius-md, 8px)",
                            border: error
                                ? "1px solid var(--ec-danger, #dc2626)"
                                : isFocused
                                ? "1px solid var(--ec-border-focus, #2563eb)"
                                : "1px solid var(--ec-border-strong, #cbd5e1)",
                            boxShadow: error
                                ? isFocused
                                    ? "var(--ec-ring-danger, 0 0 0 3px rgba(220, 38, 38, 0.18))"
                                    : "none"
                                : isFocused
                                ? "var(--ec-ring, 0 0 0 3px rgba(37, 99, 235, 0.18))"
                                : "none",
                            fontSize: "0.875rem",
                            outline: "none",
                            cursor: disabled ? "not-allowed" : "text",
                            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                            ...style,
                        }}
                        {...props}
                    />

                    {trailingIcon && (
                        <div
                            style={{
                                position: "absolute",
                                right: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 1,
                            }}
                        >
                            {trailingIcon}
                        </div>
                    )}
                </div>

                {error ? (
                    <p
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--ec-danger, #dc2626)",
                            marginTop: "0.375rem",
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
                            marginTop: "0.375rem",
                        }}
                    >
                        {helperText}
                    </p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = "Input";
