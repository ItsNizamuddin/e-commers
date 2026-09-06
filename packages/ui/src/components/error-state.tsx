import React from "react";
import { Button } from "./button";

export interface ErrorStateProps {
    title?: string;
    message: string;
    code?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = "Unable to load content",
    message,
    code,
    onRetry,
    className = "",
}: ErrorStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-rose-200 bg-rose-50/30 dark:border-rose-950 dark:bg-rose-950/10 ${className}`}>
            <div className="mb-3 flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
            {code && (
                <span className="mt-1.5 font-mono text-[10px] text-zinc-400">
                    Error Code: {code}
                </span>
            )}
            {onRetry && (
                <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}
