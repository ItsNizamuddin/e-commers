import React from "react";

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
    size?: "sm" | "md";
    label?: string;
    error?: string;
    helperText?: string;
    options?: SelectOption[];
}

const sizeClasses = {
    sm: "h-7 text-xs px-2.5 pr-7",
    md: "h-8 text-[13px] px-3 pr-8",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            size = "sm",
            label,
            error,
            helperText,
            options,
            children,
            className = "",
            disabled,
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

        return (
            <div className="flex flex-col w-full text-left">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1"
                    >
                        {label}
                    </label>
                )}

                <div className="relative flex items-center w-full">
                    <select
                        ref={ref}
                        id={selectId}
                        disabled={disabled}
                        className={`w-full rounded-md appearance-none font-normal bg-white dark:bg-[#111111] text-slate-900 dark:text-neutral-100 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${sizeClasses[size]
                            } ${error
                                ? "border border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                : "border border-slate-200 dark:border-neutral-800 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            } ${className}`}
                        {...props}
                    >
                        {options
                            ? options.map((opt) => (
                                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                    {opt.label}
                                </option>
                            ))
                            : children}
                    </select>

                    <svg
                        className="pointer-events-none absolute right-2.5 w-3.5 h-3.5 text-slate-400 dark:text-neutral-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
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

Select.displayName = "Select";
