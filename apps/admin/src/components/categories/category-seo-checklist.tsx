"use client";

import React from "react";
import { Card } from "@ecommers/ui";
import { Sparkles, CheckCircle2 } from "lucide-react";

export interface SeoCheckItem {
    label: string;
    done: boolean;
}

export interface CategorySeoChecklistProps {
    checks: SeoCheckItem[];
}

export function CategorySeoChecklist({ checks }: CategorySeoChecklistProps) {
    const score = checks.filter((c) => c.done).length;
    const percentage = (score / checks.length) * 100;

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>SEO Checklist</span>
                </h2>
                <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-neutral-400">
                    {score} / {checks.length}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full transition-all duration-300 ${
                        score >= 5
                            ? "bg-emerald-500"
                            : score >= 3
                            ? "bg-blue-500"
                            : "bg-amber-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="space-y-2">
                {checks.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                        {item.done ? (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-neutral-700 shrink-0" />
                        )}
                        <span
                            className={
                                item.done
                                    ? "text-slate-700 dark:text-neutral-300"
                                    : "text-slate-400 dark:text-neutral-500"
                            }
                        >
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
