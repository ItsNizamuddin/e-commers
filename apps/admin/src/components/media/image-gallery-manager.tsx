"use client";

import React, { useState } from "react";
import { Card, Button, Input, Label, Badge } from "@ecommers/ui";
import { Image as ImageIcon, Plus, Trash2, CheckCircle2, Star } from "lucide-react";

export interface ImageGalleryManagerProps {
    images: string[];
    thumbnail?: string;
    onChangeImages: (images: string[]) => void;
    onChangeThumbnail: (thumbnail: string) => void;
    disabled?: boolean;
}

export function ImageGalleryManager({
    images,
    thumbnail,
    onChangeImages,
    onChangeThumbnail,
    disabled = false,
}: ImageGalleryManagerProps) {
    const [urlInput, setUrlInput] = useState("");
    const [inputError, setInputError] = useState<string | null>(null);

    const handleAddImage = () => {
        if (disabled) return;
        const trimmed = urlInput.trim();
        setInputError(null);

        if (!trimmed) {
            setInputError("Please enter a valid image URL");
            return;
        }

        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
            setInputError("Image URL must start with http://, https://, or /");
            return;
        }

        if (images.includes(trimmed)) {
            setInputError("This image URL has already been added");
            return;
        }

        const newImages = [...images, trimmed];
        onChangeImages(newImages);
        setUrlInput("");

        // If no primary thumbnail set, make this the primary
        if (!thumbnail) {
            onChangeThumbnail(trimmed);
        }
    };

    const handleRemoveImage = (urlToRemove: string) => {
        if (disabled) return;
        const filtered = images.filter((img) => img !== urlToRemove);
        onChangeImages(filtered);

        if (thumbnail === urlToRemove) {
            onChangeThumbnail(filtered[0] || "");
        }
    };

    const handleSetPrimary = (url: string) => {
        if (disabled) return;
        onChangeThumbnail(url);
    };

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <ImageIcon size={15} className="text-blue-600 dark:text-blue-400" />
                    <div>
                        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Media & Product Gallery
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Add product photos and designate a primary display thumbnail.
                        </p>
                    </div>
                </div>

                <Badge variant="neutral" size="sm">
                    {images.length} {images.length === 1 ? "Image" : "Images"}
                </Badge>
            </div>

            {/* URL Input Bar */}
            <div className="flex flex-col gap-1.5 mb-4">
                <div className="flex items-center gap-2">
                    <Input
                        value={urlInput}
                        onChange={(e) => {
                            setUrlInput(e.target.value);
                            if (inputError) setInputError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddImage();
                            }
                        }}
                        placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                        disabled={disabled}
                        className="h-9 text-xs flex-1"
                    />
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleAddImage}
                        disabled={disabled || !urlInput.trim()}
                        className="h-9 text-xs gap-1 font-medium bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                        <Plus size={13} />
                        <span>Add Photo</span>
                    </Button>
                </div>

                {inputError && (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        {inputError}
                    </span>
                )}
            </div>

            {/* Images Grid */}
            {images.length === 0 ? (
                <div className="py-8 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400 mb-2">
                        <ImageIcon size={20} />
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                        No product images added yet
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                        Add one or more image URLs to display product visuals on your catalog.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {images.map((imgUrl, idx) => {
                        const isPrimary = thumbnail === imgUrl || (!thumbnail && idx === 0);

                        return (
                            <div
                                key={imgUrl}
                                className={`group relative rounded-xl border overflow-hidden transition-all bg-slate-50 dark:bg-neutral-900 ${
                                    isPrimary
                                        ? "border-blue-500 ring-2 ring-blue-500/20"
                                        : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                                }`}
                            >
                                {/* Image Preview */}
                                <div className="aspect-square w-full relative overflow-hidden bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imgUrl}
                                        alt={`Product preview ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback for broken image URLs
                                            (e.currentTarget as HTMLImageElement).src =
                                                "https://placehold.co/400x400/e2e8f0/64748b?text=Broken+Image";
                                        }}
                                    />
                                </div>

                                {/* Primary Badge / Action */}
                                <div className="p-2 flex items-center justify-between border-t border-slate-100 dark:border-neutral-800/60 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleSetPrimary(imgUrl)}
                                        disabled={disabled}
                                        className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
                                            isPrimary
                                                ? "text-blue-600 dark:text-blue-400 font-semibold"
                                                : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white"
                                        }`}
                                    >
                                        <Star size={11} className={isPrimary ? "fill-blue-600 dark:fill-blue-400" : ""} />
                                        <span>{isPrimary ? "Primary" : "Set Primary"}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(imgUrl)}
                                        disabled={disabled}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                        title="Remove photo"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
