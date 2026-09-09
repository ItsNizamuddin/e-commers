"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { VariantPriceInput, LocationResponse } from "@ecommers/types";
import { Card, Button, Input, Label } from "@ecommers/ui";
import { CreditCard, Plus, Trash2, MapPin, Check, ShieldCheck, Globe } from "lucide-react";
import { api } from "../../lib/api";

export interface CurrencyMeta {
    code: string;
    label: string;
    symbol: string;
}

export const GLOBAL_CURRENCY_METADATA: Record<string, CurrencyMeta> = {
    INR: { code: "INR", label: "Indian Rupee (INR) ₹", symbol: "₹" },
    USD: { code: "USD", label: "US Dollar (USD) $", symbol: "$" },
    AED: { code: "AED", label: "UAE Dirham (AED) د.إ", symbol: "د.إ" },
    EUR: { code: "EUR", label: "Euro (EUR) €", symbol: "€" },
    GBP: { code: "GBP", label: "British Pound (GBP) £", symbol: "£" },
    CAD: { code: "CAD", label: "Canadian Dollar (CAD) $", symbol: "$" },
    AUD: { code: "AUD", label: "Australian Dollar (AUD) $", symbol: "$" },
    SGD: { code: "SGD", label: "Singapore Dollar (SGD) S$", symbol: "S$" },
    SAR: { code: "SAR", label: "Saudi Riyal (SAR) ﷼", symbol: "﷼" },
    QAR: { code: "QAR", label: "Qatari Riyal (QAR) ﷼", symbol: "﷼" },
    KWD: { code: "KWD", label: "Kuwaiti Dinar (KWD) د.ك", symbol: "د.ك" },
    BHD: { code: "BHD", label: "Bahraini Dinar (BHD) .د.ب", symbol: ".د.ب" },
    OMR: { code: "OMR", label: "Omani Rial (OMR) ر.ع.", symbol: "ر.ع." },
    JPY: { code: "JPY", label: "Japanese Yen (JPY) ¥", symbol: "¥" },
    CHF: { code: "CHF", label: "Swiss Franc (CHF) CHF", symbol: "CHF" },
};

export interface ActiveLocationPricingTarget {
    currency: string;
    symbol: string;
    countryCode: string;
    countryName: string;
    locationCode: string;
    locationName: string;
    locationNames: string[];
    label: string;
}

export interface CustomPricingTiersProps {
    prices: VariantPriceInput[];
    onChange: (prices: VariantPriceInput[]) => void;
    baseCurrency?: string;
    disabled?: boolean;
    availableLocations?: LocationResponse[];
}

export function CustomPricingTiers({
    prices,
    onChange,
    baseCurrency = "INR",
    disabled = false,
    availableLocations,
}: CustomPricingTiersProps) {
    // Dynamic locations state
    const [locations, setLocations] = useState<LocationResponse[]>(availableLocations || []);

    // Auto-fetch locations if not passed from parent
    useEffect(() => {
        if (availableLocations && availableLocations.length > 0) {
            setLocations(availableLocations);
            return;
        }

        let isMounted = true;
        api.locations.list()
            .then((data) => {
                if (isMounted && Array.isArray(data)) {
                    setLocations(data);
                }
            })
            .catch((err) => {
                console.error("Failed to load locations for pricing tiers:", err);
            });

        return () => {
            isMounted = false;
        };
    }, [availableLocations]);

    // Filter strictly ACTIVE locations from database
    const activeLocations = useMemo(() => {
        return (locations || []).filter((loc) => loc.isActive !== false);
    }, [locations]);

    // Standard country name displayer
    const regionNames = useMemo(() => {
        try {
            return new Intl.DisplayNames(["en"], { type: "region" });
        } catch {
            return null;
        }
    }, []);

    // Map active locations grouped by currency/market from the database
    const activeLocationTargets = useMemo<ActiveLocationPricingTarget[]>(() => {
        const map = new Map<string, ActiveLocationPricingTarget>();

        for (const loc of activeLocations) {
            if (!loc.currency) continue;
            const currency = loc.currency.toUpperCase().trim();
            const countryCode = (loc.countryCode || "").toUpperCase().trim();
            const resolvedCountry =
                (countryCode && regionNames?.of(countryCode)) ||
                (loc.type === "COUNTRY" ? loc.name : countryCode || "Global");
            const symbol = GLOBAL_CURRENCY_METADATA[currency]?.symbol || currency;

            if (!map.has(currency)) {
                map.set(currency, {
                    currency,
                    symbol,
                    countryCode,
                    countryName: resolvedCountry,
                    locationCode: loc.code.toLowerCase(),
                    locationName: loc.name,
                    locationNames: [loc.name],
                    label: `${currency} (${symbol}) · ${resolvedCountry}`,
                });
            } else {
                const existing = map.get(currency)!;
                if (!existing.locationNames.includes(loc.name)) {
                    existing.locationNames.push(loc.name);
                }
                existing.label = `${currency} (${symbol}) · ${existing.countryName} (${existing.locationNames.join(", ")})`;
            }
        }

        return Array.from(map.values());
    }, [activeLocations, regionNames]);

    // Ensure safe default tier matching baseCurrency
    const safePrices = prices.length > 0 ? prices : [{ currency: baseCurrency, amount: 0 }];

    // Auto-enrich any existing tiers (including Tier 1) with country and location metadata
    useEffect(() => {
        if (activeLocationTargets.length === 0) return;

        let hasMissingMetadata = false;
        const enriched = safePrices.map((tier) => {
            const tierCurr = (tier.currency || "").toUpperCase();
            const match = activeLocationTargets.find((t) => t.currency === tierCurr);
            if (match && (!tier.countryCode || !tier.countryName || !tier.locationName)) {
                hasMissingMetadata = true;
                return {
                    ...tier,
                    countryCode: tier.countryCode || match.countryCode,
                    countryName: tier.countryName || match.countryName,
                    locationCode: tier.locationCode || match.locationCode,
                    locationName: tier.locationName || (match.locationNames.length > 1 ? `${match.countryName} (${match.locationNames.join(", ")})` : match.locationName),
                };
            }
            return tier;
        });

        if (hasMissingMetadata) {
            onChange(enriched);
        }
    }, [activeLocationTargets, safePrices, onChange]);

    // Currencies already used in current tiers
    const usedCurrencies = useMemo(() => {
        return new Set(safePrices.map((p) => (p.currency || "").toUpperCase()));
    }, [safePrices]);

    // Check if more active location tiers can be added
    const unusedTargets = useMemo(() => {
        return activeLocationTargets.filter((t) => !usedCurrencies.has(t.currency));
    }, [activeLocationTargets, usedCurrencies]);

    const canAddMoreTiers = unusedTargets.length > 0;

    const handleAddTier = () => {
        if (disabled || !canAddMoreTiers) return;
        const nextTarget = unusedTargets[0];

        onChange([
            ...safePrices,
            {
                currency: nextTarget.currency,
                amount: 0,
                compareAtAmount: undefined,
                countryCode: nextTarget.countryCode,
                countryName: nextTarget.countryName,
                locationCode: nextTarget.locationCode,
                locationName: nextTarget.locationNames.length > 1
                    ? `${nextTarget.countryName} (${nextTarget.locationNames.join(", ")})`
                    : nextTarget.locationName,
            },
        ]);
    };

    const handleRemoveTier = (index: number) => {
        if (disabled || index === 0) return; // Tier 1 cannot be removed
        onChange(safePrices.filter((_, i) => i !== index));
    };

    const handleSelectTarget = (index: number, selectedCurrency: string) => {
        const target = activeLocationTargets.find((t) => t.currency === selectedCurrency);
        if (!target) return;

        const updated = safePrices.map((tier, i) => {
            if (i !== index) return tier;
            return {
                ...tier,
                currency: target.currency,
                countryCode: target.countryCode,
                countryName: target.countryName,
                locationCode: target.locationCode,
                locationName: target.locationNames.length > 1
                    ? `${target.countryName} (${target.locationNames.join(", ")})`
                    : target.locationName,
            };
        });
        onChange(updated);
    };

    const handleUpdateAmount = (
        index: number,
        field: "amount" | "compareAtAmount" | "costAmount",
        value: string
    ) => {
        if (disabled) return;
        const updated = safePrices.map((tier, i) => {
            if (i !== index) return tier;

            if (field === "amount") {
                const num = parseFloat(value);
                return { ...tier, amount: isNaN(num) ? 0 : num };
            }
            if (field === "compareAtAmount") {
                if (value === "") return { ...tier, compareAtAmount: undefined };
                const num = parseFloat(value);
                return { ...tier, compareAtAmount: isNaN(num) ? undefined : num };
            }
            if (field === "costAmount") {
                if (value === "") return { ...tier, costAmount: undefined };
                const num = parseFloat(value);
                return { ...tier, costAmount: isNaN(num) ? undefined : num };
            }
            return tier;
        });

        onChange(updated);
    };

    return (
        <Card className="p-3.5 sm:p-4 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <CreditCard size={15} className="text-slate-500 dark:text-neutral-400" />
                    <div>
                        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                            <span>Location-Based Pricing Tiers</span>
                            <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                                Active Locations Only
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                            {activeLocationTargets.length > 0
                                ? `Filtered strictly to ${activeLocationTargets.length} active delivery destination${activeLocationTargets.length === 1 ? "" : "s"} in your database.`
                                : "Define currency and country-specific prices for buyers."}
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTier}
                    disabled={disabled || !canAddMoreTiers}
                    className="h-7 text-xs gap-1 font-medium border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 disabled:opacity-50"
                    title={!canAddMoreTiers ? "All active delivery zones from your database have pricing configured" : "Add pricing tier for next active location"}
                >
                    <Plus size={13} />
                    <span>{canAddMoreTiers ? `Add Tier (${unusedTargets.length} left)` : "All Locations Configured"}</span>
                </Button>
            </div>

            {/* Pricing Tiers List */}
            <div className="flex flex-col gap-3">
                {safePrices.map((tier, idx) => {
                    const isDefault = idx === 0;
                    const tierCurrency = (tier.currency || "").toUpperCase();

                    // Check if current currency is from an active location in database
                    const matchedTarget = activeLocationTargets.find((t) => t.currency === tierCurrency);

                    return (
                        <div
                            key={`${tier.currency}-${idx}`}
                            className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-900/30 flex flex-col gap-3"
                        >
                            {/* Tier Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                        Pricing Tier {idx + 1}
                                    </span>
                                    {isDefault ? (
                                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                                            Default Base ({tierCurrency})
                                        </span>
                                    ) : null}

                                    {matchedTarget ? (
                                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1">
                                            <MapPin size={10} />
                                            <span>
                                                {matchedTarget.countryName} ({matchedTarget.locationNames.join(", ")})
                                            </span>
                                        </span>
                                    ) : tier.countryName ? (
                                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 flex items-center gap-1">
                                            <MapPin size={10} />
                                            <span>{tier.countryName} ({tier.countryCode})</span>
                                        </span>
                                    ) : null}
                                </div>

                                {!isDefault && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTier(idx)}
                                        disabled={disabled}
                                        className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={13} />
                                        <span>Remove</span>
                                    </button>
                                )}
                            </div>

                            {/* 3-Column Inputs: Sale Price, Compare At Price, Active Location Currency */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Sale Price */}
                                <div>
                                    <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                        Sale Price ({matchedTarget?.symbol || tierCurrency}) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier.amount || ""}
                                        onChange={(e) => handleUpdateAmount(idx, "amount", e.target.value)}
                                        placeholder={isDefault ? "2000" : "e.g. 15"}
                                        disabled={disabled}
                                        className="h-9 text-xs"
                                    />
                                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                        The offered / discounted price
                                    </p>
                                </div>

                                {/* Original Price (compareAtAmount) */}
                                <div>
                                    <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                        Original Price (Compare At)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tier.compareAtAmount ?? ""}
                                        onChange={(e) => handleUpdateAmount(idx, "compareAtAmount", e.target.value)}
                                        placeholder={isDefault ? "3000" : "e.g. 25"}
                                        disabled={disabled}
                                        className="h-9 text-xs"
                                    />
                                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                        Strike-through original market price
                                    </p>
                                </div>

                                {/* Active Location & Currency Selector */}
                                <div>
                                    <Label className="text-xs font-medium block mb-1 text-slate-700 dark:text-neutral-300">
                                        Active Delivery Location <span className="text-rose-500">*</span>
                                    </Label>

                                    <select
                                        value={tier.currency}
                                        onChange={(e) => handleSelectTarget(idx, e.target.value)}
                                        disabled={disabled || isDefault}
                                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                        {/* Strictly list active locations from database */}
                                        {activeLocationTargets.map((target) => (
                                            <option key={target.currency} value={target.currency}>
                                                {target.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Frontend geolocation filtering hint */}
                                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5">
                                        <ShieldCheck size={12} className="shrink-0" />
                                        <span className="truncate">
                                            Saved with {tier.countryCode || matchedTarget?.countryCode || "country"}:{" "}
                                            <strong>{tier.countryName || matchedTarget?.countryName || "Location"}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
