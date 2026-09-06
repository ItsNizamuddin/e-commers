"use client";

import React from "react";
import { Button } from "./button";

export interface PaginationProps {
    page: number;
    totalPages: number;
    totalItems?: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function Pagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    className = "",
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const startItem = totalItems !== undefined && pageSize !== undefined ? (page - 1) * pageSize + 1 : undefined;
    const endItem =
        totalItems !== undefined && pageSize !== undefined
            ? Math.min(page * pageSize, totalItems)
            : undefined;

    return (
        <div className={`flex items-center justify-between gap-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 ${className}`}>
            <div>
                {totalItems !== undefined ? (
                    <span>
                        Showing <strong className="text-zinc-900 dark:text-zinc-100">{startItem}</strong> to{" "}
                        <strong className="text-zinc-900 dark:text-zinc-100">{endItem}</strong> of{" "}
                        <strong className="text-zinc-900 dark:text-zinc-100">{totalItems}</strong> items
                    </span>
                ) : (
                    <span>
                        Page <strong className="text-zinc-900 dark:text-zinc-100">{page}</strong> of{" "}
                        <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong>
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </Button>
                <div className="px-2 font-medium">
                    {page} / {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
