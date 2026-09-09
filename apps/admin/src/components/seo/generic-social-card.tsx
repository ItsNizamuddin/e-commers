"use client";

import React, { useState } from "react";
import { Card, Button, Input, Textarea, Label } from "@ecommers/ui";
import { Share2, Image as ImageIcon, Copy, Check } from "lucide-react";

export interface GenericSocialCardProps {
    entityTitle: string;
    entityDescription?: string;
    primaryImage?: string;
    metaTitle?: string;
    metaDescription?: string;

    ogTitle: string;
    setOgTitle: (val: string) => void;
    ogDescription: string;
    setOgDescription: (val: string) => void;
    ogImage: string;
    setOgImage: (val: string) => void;

    disabled?: boolean;
}

export function GenericSocialCard({
    entityTitle,
    entityDescription = "",
    primaryImage = "",
    metaTitle = "",
    metaDescription = "",
    ogTitle,
    setOgTitle,
    ogDescription,
    setOgDescription,
    ogImage,
    setOgImage,
    disabled = false,
}: GenericSocialCardProps) {
    const [copied, setCopied] = useState(false);

    const handleSync = () => {
        setOgTitle(metaTitle || entityTitle);
        setOgDescription(metaDescription || entityDescription);
        if (primaryImage) {
            setOgImage(primaryImage);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayImage = ogImage || primaryImage;
    const displayTitle = ogTitle || metaTitle || entityTitle || "Preview Social Title";
    const displayDesc = ogDescription || metaDescription || entityDescription || "Preview description for shared links across social messaging platforms.";

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Share2 size={13} />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Social Sharing Card (Open Graph)
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Controls the card preview when shared on WhatsApp, Facebook, LinkedIn, or X.
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={disabled}
                    className="h-7 text-[11px] gap-1 text-slate-700 dark:text-neutral-300 border-dashed"
                >
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>Sync from Meta</span>
                </Button>
            </div>

            {/* Social Card Preview */}
            <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0A0A0A] max-w-sm">
                <div className="h-32 w-full bg-slate-200 dark:bg-neutral-800 relative flex items-center justify-center overflow-hidden">
                    {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={displayImage}
                            alt="Social card preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-neutral-600">
                            <ImageIcon size={20} />
                            <span className="text-[10px]">No Social Image</span>
                        </div>
                    )}
                </div>
                <div className="p-2.5">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 dark:text-neutral-500">
                        yourstore.com
                    </span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                        {displayTitle}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                        {displayDesc}
                    </p>
                </div>
            </div>

            {/* OG Fields */}
            <div className="space-y-3">
                <div>
                    <Label className="mb-1">OG Title</Label>
                    <Input
                        size="sm"
                        value={ogTitle}
                        onChange={(e) => setOgTitle(e.target.value)}
                        placeholder={metaTitle || entityTitle || "Social title"}
                        disabled={disabled}
                    />
                </div>

                <div>
                    <Label className="mb-1">OG Description</Label>
                    <Textarea
                        rows={2}
                        value={ogDescription}
                        onChange={(e) => setOgDescription(e.target.value)}
                        placeholder={metaDescription || entityDescription || "Brief description for social media feeds"}
                        disabled={disabled}
                    />
                </div>

                <div>
                    <Label className="mb-1">OG Image URL</Label>
                    <Input
                        size="sm"
                        value={ogImage}
                        onChange={(e) => setOgImage(e.target.value)}
                        placeholder="https://... or item thumbnail URL"
                        disabled={disabled}
                    />
                </div>
            </div>
        </Card>
    );
}
