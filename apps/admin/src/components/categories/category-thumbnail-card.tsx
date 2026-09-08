"use client";

import React from "react";
import { Card, Input, Label } from "@ecommers/ui";
import { Image as ImageIcon } from "lucide-react";

export interface CategoryThumbnailCardProps {
    image: string;
    setImage: (val: string) => void;
    disabled?: boolean;
}

export function CategoryThumbnailCard({
    image,
    setImage,
    disabled = false,
}: CategoryThumbnailCardProps) {
    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white pb-2 mb-3 border-b border-slate-100 dark:border-neutral-800">
                Category Thumbnail
            </h2>

            <div className="space-y-3">
                <div>
                    <Label className="mb-1">Image URL</Label>
                    <Input
                        size="sm"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        disabled={disabled}
                    />
                </div>

                {/* Image Preview */}
                <div className="h-32 rounded-lg border border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                    {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image}
                            alt="Thumbnail Preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-neutral-600">
                            <ImageIcon size={18} />
                            <span className="text-[11px]">No image URL set</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
