import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            error,
            helperText,
            className = "",
            disabled,
            id,
            rows = 3,
            ...props
        },
        ref
    ) => {
        const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div className="flex flex-col w-full text-left">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1"
                    >
                        {label}
                    </label>
                )}

                <textarea
                    ref={ref}
                    id={textareaId}
                    rows={rows}
                    disabled={disabled}
                    className={`w-full rounded-md text-[13px] p-2.5 bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 outline-none transition-all resize-y disabled:opacity-60 disabled:cursor-not-allowed ${
                        error
                            ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            : "border border-slate-200 dark:border-neutral-800 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    } ${className}`}
                    {...props}
                />

                {error ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{error}</p>
                ) : helperText ? (
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";
