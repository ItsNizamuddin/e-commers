"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export function ProductSortSelect({ currentSort = "newest" }: { currentSort?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        if (val === "newest") {
            current.delete("sort");
        } else {
            current.set("sort", val);
        }

        const search = current.toString();
        router.push(`/products${search ? `?${search}` : ""}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                <ArrowUpDown size={13} />
                <span>Sort by:</span>
            </span>
            <select
                value={currentSort}
                onChange={handleSortChange}
                className="bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
            >
                <option value="newest">Newest Harvest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="title">Alphabetical (A-Z)</option>
            </select>
        </div>
    );
}
