import React from "react";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

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
            ...props
        },
        ref
    ) => {
        const baseStyles =
            "inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none";

        const sizeStyles = {
            sm: "text-xs px-2.5 py-1.5 gap-1.5 h-8",
            md: "text-sm px-3.5 py-2 gap-2 h-9",
            lg: "text-base px-4 py-2.5 gap-2.5 h-11",
        };

        const variantStyles = {
            primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 shadow-sm",
            secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 focus-visible:ring-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
            outline: "border border-zinc-300 bg-transparent text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800",
            ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800",
            danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm",
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <Spinner size={size === "lg" ? "md" : "sm"} className="text-current" />
                ) : (
                    leftIcon
                )}
                <span>{children}</span>
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = "Button";
