"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShoppingBag, QrCode } from "lucide-react";

export interface ProductGalleryProps {
    images: string[];
    title: string;
}

export function ProductGallery({ images = [], title }: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    const activeImage = images[activeIndex] || images[0];

    return (
        <div className="space-y-4">
            {/* Primary Main Image Container */}
            <div className="relative aspect-square w-full rounded-3xl bg-zinc-100 overflow-hidden border border-zinc-200/80 shadow-xs">
                {activeImage ? (
                    <Image
                        src={activeImage}
                        alt={`${title} - image ${activeIndex + 1}`}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-all duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                        <ShoppingBag size={48} className="stroke-[1.5]" />
                        <span className="text-xs font-mono">Pure Artisanal Packaging</span>
                    </div>
                )}

                {/* Batch Traceability Badge overlay */}
                <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs font-bold text-emerald-800 shadow-xs border border-emerald-100">
                        <QrCode size={13} />
                        <span>100% Traceable Lot</span>
                    </span>
                </div>
            </div>

            {/* Thumbnail Carousel / Selector */}
            {images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {images.map((img, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveIndex(idx)}
                                className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                    isActive
                                        ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                                        : "border-zinc-200 hover:border-zinc-300 opacity-80 hover:opacity-100"
                                }`}
                                aria-label={`View image ${idx + 1}`}
                            >
                                <Image
                                    src={img}
                                    alt={`${title} thumbnail ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
