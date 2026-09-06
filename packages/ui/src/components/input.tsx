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
            ...props
        },
        ref
    ) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div className="flex flex-col gap-1.5 w-full text-left">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                        {label}
                    </label>
                )}
                <div className="relative flex items-center w-full">
                    {leadingIcon && (
                        <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center">
                            {leadingIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:placeholder:text-zinc-500 ${
                            leadingIcon ? "pl-9" : ""
                        } ${trailingIcon ? "pr-9" : ""} ${
                            error
                                ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500"
                                : "border-zinc-300 focus:ring-indigo-500/20 focus:border-indigo-600"
                        } ${className}`}
                        {...props}
                    />
                    {trailingIcon && (
                        <div className="absolute right-3 text-zinc-400 flex items-center">
                            {trailingIcon}
                        </div>
                    )}
                </div>
                {error ? (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
                ) : helperText ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = "Input";
