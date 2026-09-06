import React from "react";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
    size?: "sm" | "md" | "lg";
}

const sizePixelMap = {
    sm: 16,
    md: 20,
    lg: 28,
};

export function Spinner({
    size = "md",
    className = "",
    style,
    ...props
}: SpinnerProps) {
    const px = sizePixelMap[size];

    return (
        <svg
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`ec-animate-spin ${className}`}
            style={{
                width: `${px}px`,
                height: `${px}px`,
                minWidth: `${px}px`,
                minHeight: `${px}px`,
                display: "inline-block",
                verticalAlign: "middle",
                animation: "ec-spin 0.75s linear infinite",
                color: "inherit",
                flexShrink: 0,
                ...style,
            }}
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
