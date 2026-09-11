"use client";

import React, { useState } from "react";
import type { ProductVariantInput, WeightUnit, LocationResponse } from "@ecommers/types";
import { Card, Badge, Button, Input, Select, Label } from "@ecommers/ui";
import {
    Layers,
    Plus,
    Trash2,
    Package,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Check,
} from "lucide-react";
import { CustomPricingTiers } from "../pricing/custom-pricing-tiers";

export interface VariantMatrixManagerProps {
    variants: ProductVariantInput[];
    onChange: (variants: ProductVariantInput[]) => void;
    productTitle?: string;
    baseCurrency?: string;
    disabled?: boolean;
    availableLocations?: LocationResponse[];
}

const COMMON_WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
    { value: "g", label: "Grams (g)" },
    { value: "kg", label: "Kilograms (kg)" },
    { value: "ml", label: "Milliliters (ml)" },
    { value: "l", label: "Liters (l)" },
    { value: "pcs", label: "Pieces (pcs)" },
    { value: "oz", label: "Ounces (oz)" },
    { value: "lb", label: "Pounds (lb)" },
];

const PACK_SIZE_PRESETS = [
    { title: "250 g", weight: 250, unit: "g" },
    { title: "500 g", weight: 500, unit: "g" },
    { title: "750 g", weight: 750, unit: "g" },
    { title: "1 kg", weight: 1, unit: "kg" },
    { title: "2 kg", weight: 2, unit: "kg" },
];

export function VariantMatrixManager({
    variants,
    onChange,
    productTitle = "",
    baseCurrency = "INR",
    disabled = false,
    availableLocations,
}: VariantMatrixManagerProps) {
    const [expandedIndex, setExpandedIndex] = useState<number>(0);

    const generateSku = (packTitle: string, index: number): string => {
        const prefix = productTitle
            ? productTitle
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .slice(0, 4)
                  .toUpperCase()
            : "PRD";
        const cleanPack = packTitle.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || `V${index + 1}`;
        return `${prefix}-${cleanPack}`;
    };

    const handleAddPreset = (preset: { title: string; weight: number; unit: string }) => {
        if (disabled) return;
        const newSku = generateSku(preset.title, variants.length);
        const newVariant: ProductVariantInput = {
            sku: newSku,
            title: preset.title,
            weight: preset.weight,
            weightUnit: preset.unit,
            initialStock: 50,
            isActive: true,
            prices: [
                {
                    currency: baseCurrency,
                    amount: 0,
                    compareAtAmount: undefined,
                },
            ],
        };

        const updated = [...variants, newVariant];
        onChange(updated);
        setExpandedIndex(updated.length - 1);
    };

    const handleAddCustom = () => {
        if (disabled) return;
        const title = `Pack Size ${variants.length + 1}`;
        const newSku = generateSku(title, variants.length);
        const newVariant: ProductVariantInput = {
            sku: newSku,
            title,
            weight: 500,
            weightUnit: "g",
            initialStock: 50,
            isActive: true,
            prices: [
                {
                    currency: baseCurrency,
                    amount: 0,
                    compareAtAmount: undefined,
                },
            ],
        };

        const updated = [...variants, newVariant];
        onChange(updated);
        setExpandedIndex(updated.length - 1);
    };

    const handleRemoveVariant = (index: number) => {
        if (disabled) return;
        const updated = variants.filter((_, i) => i !== index);
        onChange(updated);
        setExpandedIndex(Math.max(0, index - 1));
    };

    const handleUpdateVariant = (index: number, patch: Partial<ProductVariantInput>) => {
        if (disabled) return;
        const updated = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
        onChange(updated);
    };

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <Layers size={15} className="text-blue-600 dark:text-blue-400" />
                    <div>
                        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Pack Sizes & Sellable Variants
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Configure pack sizes (500 g, 1 kg), variant SKUs, initial stock, and multi-currency pricing tiers.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustom}
                        disabled={disabled}
                        className="h-7 text-xs gap-1 font-medium border-slate-200 dark:border-neutral-800"
                    >
                        <Plus size={13} />
                        <span>Add Pack Size</span>
                    </Button>
                </div>
            </div>

            {/* Quick Add Presets Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-2 bg-slate-50 dark:bg-neutral-900/50 rounded-lg border border-slate-100 dark:border-neutral-800">
                <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 mr-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Quick Presets:</span>
                </span>
                {PACK_SIZE_PRESETS.map((preset) => {
                    const alreadyHas = variants.some((v) => v.title.toLowerCase() === preset.title.toLowerCase());
                    return (
                        <button
                            key={preset.title}
                            type="button"
                            onClick={() => handleAddPreset(preset)}
                            disabled={disabled || alreadyHas}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                                alreadyHas
                                    ? "bg-slate-200/60 dark:bg-neutral-800 text-slate-400 cursor-not-allowed"
                                    : "bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 hover:border-blue-500 hover:text-blue-600 shadow-2xs"
                            }`}
                        >
                            {alreadyHas ? `✓ ${preset.title}` : `+ ${preset.title}`}
                        </button>
                    );
                })}
            </div>

            {/* Variants Accordion List */}
            <div className="flex flex-col gap-3">
                {variants.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50/40 dark:bg-neutral-900/20">
                        <Package size={30} className="mx-auto text-slate-300 dark:text-neutral-600 mb-2.5" />
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                            No Pack Sizes or Pricing Added Yet
                        </h4>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500 max-w-sm mx-auto mt-1 mb-3.5">
                            Click a quick preset above (e.g. + 500 g, + 1 kg) or click &apos;Add Pack Size&apos; to enter your prices and pack details.
                        </p>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleAddCustom}
                            disabled={disabled}
                            className="text-xs gap-1.5"
                        >
                            <Plus size={13} />
                            <span>Add Pack Size</span>
                        </Button>
                    </div>
                ) : (
                    variants.map((v, idx) => {
                        const isExpanded = expandedIndex === idx;
                        const primaryPrice = v.prices[0]?.amount || 0;
                        const currencySymbol = v.prices[0]?.currency || baseCurrency;

                        return (
                            <div
                                key={idx}
                                className={`rounded-xl border transition-all ${
                                    isExpanded
                                        ? "border-blue-300 dark:border-blue-800 bg-white dark:bg-[#131313] shadow-xs"
                                        : "border-slate-200 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-900/30 hover:border-slate-300"
                                }`}
                            >
                                {/* Variant Summary Header */}
                                <div
                                    onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                                    className="p-3 sm:px-4 flex items-center justify-between cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                                            {idx + 1}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {v.title || `Variant ${idx + 1}`}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">
                                                    SKU: {v.sku || "UNASSIGNED"}
                                                </span>
                                                {v.weight && (
                                                    <Badge variant="neutral" size="sm">
                                                        {v.weight} {v.weightUnit}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                {currencySymbol} {primaryPrice.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-neutral-500 block">
                                                Stock: {v.initialStock ?? 0} units
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveVariant(idx);
                                            }}
                                            disabled={disabled}
                                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                            title="Delete Variant"
                                        >
                                            <Trash2 size={13} />
                                        </button>

                                    <div className="text-slate-400">
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details Body */}
                            {isExpanded && (
                                <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-neutral-800/80 flex flex-col gap-4">
                                    {/* Variant Attributes Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {/* Title / Pack Size */}
                                        <div>
                                            <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                                Pack Size / Title <span className="text-rose-500">*</span>
                                            </Label>
                                            <Input
                                                value={v.title}
                                                onChange={(e) => handleUpdateVariant(idx, { title: e.target.value })}
                                                placeholder="e.g. 500 g"
                                                disabled={disabled}
                                                className="h-9 text-xs"
                                            />
                                        </div>

                                        {/* SKU */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <Label className="text-xs font-medium text-slate-700 dark:text-neutral-300">
                                                    SKU <span className="text-rose-500">*</span>
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateVariant(idx, { sku: generateSku(v.title, idx) })}
                                                    disabled={disabled}
                                                    className="text-[10px] text-blue-600 hover:underline"
                                                >
                                                    Auto-generate
                                                </button>
                                            </div>
                                            <Input
                                                value={v.sku}
                                                onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value.toUpperCase() })}
                                                placeholder="e.g. KFAGLS500"
                                                disabled={disabled}
                                                className="h-9 text-xs font-mono"
                                            />
                                        </div>

                                        {/* Weight & Unit */}
                                        <div>
                                            <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                                Weight & Measurement
                                            </Label>
                                            <div className="flex items-center gap-1.5">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={v.weight || ""}
                                                    onChange={(e) => handleUpdateVariant(idx, { weight: parseFloat(e.target.value) || 0 })}
                                                    placeholder="500"
                                                    disabled={disabled}
                                                    className="h-9 text-xs flex-1"
                                                />
                                                <Select
                                                    value={v.weightUnit || "g"}
                                                    onChange={(e) => handleUpdateVariant(idx, { weightUnit: e.target.value as WeightUnit })}
                                                    disabled={disabled}
                                                    className="h-9 text-xs w-24 shrink-0"
                                                >
                                                    {COMMON_WEIGHT_UNITS.map((u) => (
                                                        <option key={u.value} value={u.value}>
                                                            {u.value}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Initial Stock */}
                                        <div>
                                            <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                                Initial Stock (Units)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={v.initialStock ?? ""}
                                                onChange={(e) => handleUpdateVariant(idx, { initialStock: parseInt(e.target.value, 10) || 0 })}
                                                placeholder="100"
                                                disabled={disabled}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Embedded Custom Pricing Tiers with Location-synced currencies */}
                                    <CustomPricingTiers
                                        prices={v.prices}
                                        onChange={(newPrices) => handleUpdateVariant(idx, { prices: newPrices })}
                                        baseCurrency={baseCurrency}
                                        disabled={disabled}
                                        availableLocations={availableLocations}
                                    />
                                </div>
                            )}
                        </div>
                    );
                }))}
            </div>
        </Card>
    );
}
