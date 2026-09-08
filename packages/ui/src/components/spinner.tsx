import React from "react";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
    size?: "sm" | "md" | "lg";
}

const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
};

export function Spinner({
    size = "md",
    className = "",
    ...props
}: SpinnerProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`animate-spin inline-block align-middle shrink-0 text-current ${sizeClasses[size]} ${className}`}
            aria-hidden="true"
            {...props}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeOpacity="0.2"
            />
            <path
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                fill="currentColor"
            />
        </svg>
    );
}
