import React from "react";

export interface FormFieldProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    id?: string;
    children: React.ReactNode;
    className?: string;
}

export function FormField({
    label,
    error,
    helperText,
    required = false,
    id,
    children,
    className = "",
}: FormFieldProps) {
    return (
        <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
            {label && (
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                    {label}
                    {required && <span className="ml-1 text-rose-500">*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            ) : helperText ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
            ) : null}
        </div>
    );
}
