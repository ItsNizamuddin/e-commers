import React from "react";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const sizeClasses = {
    sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
    md: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
    lg: "h-9 px-4 text-sm gap-2 rounded-md",
};

const variantClasses = {
    primary:
        "bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.99] border border-transparent font-medium",
    secondary:
        "bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100 border border-slate-200 dark:border-neutral-700 active:scale-[0.99] font-medium",
    outline:
        "bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800 active:scale-[0.99] font-medium",
    ghost:
        "bg-transparent hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-300 border border-transparent active:scale-[0.99] font-medium",
    danger:
        "bg-red-600 hover:bg-red-700 text-white shadow-xs active:scale-[0.99] border border-transparent font-medium",
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
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                type={type}
                disabled={isDisabled}
                className={`inline-flex items-center justify-center select-none whitespace-nowrap transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer [&_svg]:size-[14px] ${
                    sizeClasses[size]
                } ${variantClasses[variant]} ${className}`}
                style={style}
                {...props}
            >
                {isLoading ? (
                    <Spinner size={size === "lg" ? "md" : "sm"} />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = "Button";
