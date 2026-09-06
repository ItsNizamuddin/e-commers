import React from "react";
import { Button } from "./button.js";

export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon,
    action,
    className = "",
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 ${className}`}>
            {icon && (
                <div className="mb-3.5 flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {icon}
                </div>
            )}
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            {action && (
                <div className="mt-4">
                    <Button size="sm" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </div>
            )}
        </div>
    );
}
