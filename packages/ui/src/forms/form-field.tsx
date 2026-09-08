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
        <div className={`flex flex-col gap-1.5 w-full text-left ${className}`} style={style}>
            {label && (
                <label
                    htmlFor={id}
                    className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    <span>{label}</span>
                    {required && (
                        <span className="text-rose-500 ml-1 font-bold">
                            *
                        </span>
                    )}
                </label>
            )}

            {children}

            {error ? (
                <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 font-medium">
                    {error}
                </p>
            ) : helperText ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {helperText}
                </p>
            ) : null}
        </div>
    );
}
