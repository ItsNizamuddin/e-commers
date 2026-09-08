import React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    size?: "sm" | "md";
    label?: string;
    error?: string;
    helperText?: string;
    leadingIcon?: React.ReactNode;
    trailingIcon?: React.ReactNode;
}

const sizeClasses = {
    sm: "h-7 text-xs px-2.5",
    md: "h-8 text-[13px] px-3",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            size = "md",
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
            <div className="flex flex-col w-full text-left">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1"
                    >
                        {label}
                    </label>
                )}

                <div className="relative flex items-center w-full">
                    {leadingIcon && (
                        <div
                            className={`absolute left-2.5 flex items-center justify-center pointer-events-none z-10 transition-colors [&_svg]:size-[14px] ${
                                isFocused
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-slate-400 dark:text-neutral-500"
                            }`}
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
                        className={`w-full rounded-md bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            sizeClasses[size]
                        } ${leadingIcon ? (size === "sm" ? "pl-7" : "pl-8") : ""} ${
                            trailingIcon ? (size === "sm" ? "pr-7" : "pr-8") : ""
                        } ${
                            error
                                ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                : "border border-slate-200 dark:border-neutral-800 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        } ${className}`}
                        style={style}
                        {...props}
                    />

                    {trailingIcon && (
                        <div className="absolute right-2.5 flex items-center justify-center z-10 text-slate-400 dark:text-neutral-500 [&_svg]:size-[14px]">
                            {trailingIcon}
                        </div>
                    )}
                </div>

                {error ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{error}</p>
                ) : helperText ? (
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = "Input";
