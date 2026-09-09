"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import type {
    LocationResponse,
    UpdateLocationInput,
    LocationType,
} from "@ecommers/types";
import { Card, Badge, Button, Input, Select, Label, Spinner } from "@ecommers/ui";
import {
    ArrowLeft,
    MapPin,
    Save,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

export default function EditLocationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [location, setLocation] = useState<LocationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [type, setType] = useState<LocationType>("CITY");
    const [stateOrRegion, setStateOrRegion] = useState("");
    const [countryCode, setCountryCode] = useState("IN");
    const [currency, setCurrency] = useState("INR");
    const [deliveryEstimate, setDeliveryEstimate] = useState("Within 24 Hours");
    const [postalCodesStr, setPostalCodesStr] = useState("");
    const [postalCodePrefixesStr, setPostalCodePrefixesStr] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setFetchError(null);
        api.locations.get(id)
            .then((loc) => {
                setLocation(loc);
                setName(loc.name);
                setType(loc.type);
                setStateOrRegion(loc.stateOrRegion || "");
                setCountryCode(loc.countryCode);
                setCurrency(loc.currency || "INR");
                setDeliveryEstimate(loc.deliveryEstimate || "Within 24 Hours");
                setPostalCodesStr((loc.postalCodes || []).join(", "));
                setPostalCodePrefixesStr((loc.postalCodePrefixes || []).join(", "));
                setIsActive(loc.isActive);
            })
            .catch((err: unknown) => {
                if (err instanceof Error) {
                    setFetchError(err.message);
                } else {
                    setFetchError("Failed to load location details.");
                }
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSaveNotice(null);

        if (!name.trim()) {
            setFormError("Location name is required.");
            return;
        }

        const postalCodes = postalCodesStr
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

        const postalCodePrefixes = postalCodePrefixesStr
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

        setIsSaving(true);
        try {
            const payload: UpdateLocationInput = {
                name: name.trim(),
                type,
                stateOrRegion: stateOrRegion.trim() || undefined,
                countryCode: countryCode.trim().toUpperCase(),
                currency: currency.trim().toUpperCase() || undefined,
                deliveryEstimate: deliveryEstimate.trim() || undefined,
                postalCodes,
                postalCodePrefixes,
                isActive,
            };

            const updated = await api.locations.update(id, payload);
            setLocation(updated);
            setSaveNotice("Location details updated successfully!");
            setTimeout(() => setSaveNotice(null), 3000);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setFormError(err.message);
            } else {
                setFormError("Failed to update location.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Spinner size="md" />
                <p className="text-xs">Loading location configuration...</p>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="py-16 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Location not found or has been removed.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/locations")}
                    className="gap-1.5"
                >
                    <ArrowLeft size={13} />
                    <span>Back to Locations</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/locations")}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Back to Locations"
                    >
                        <ArrowLeft size={14} />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Edit Location: {location.name}</span>
                            <code className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                                {location.code}
                            </code>
                            <Badge variant={isActive ? "success" : "neutral"} size="sm">
                                {isActive ? "Active" : "Disabled"}
                            </Badge>
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                            Modify postal code ranges, regional parameters, and storefront delivery settings.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
                    >
                        <Save size={13} />
                        <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                    </Button>
                </div>
            </div>

            {/* Notifications */}
            {saveNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{saveNotice}</span>
                </div>
            )}

            {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            {/* Form Card */}
            <Card className="p-4 sm:p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <MapPin size={13} />
                        </div>
                        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Location Configuration
                        </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">
                        Code: {location.code} (Immutable)
                    </span>
                </div>

                {/* Name and Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                        <Label className="mb-1">Display Name *</Label>
                        <Input
                            size="sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bangalore"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">Location Type *</Label>
                        <Select
                            size="sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as LocationType)}
                            disabled={isSaving}
                            options={[
                                { value: "CITY", label: "City (Urban Hub)" },
                                { value: "COUNTRY", label: "Country (Regional / International)" },
                                { value: "ZONE", label: "Zone / State" },
                            ]}
                        />
                    </div>
                </div>

                {/* State, Country Code, and Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                        <Label className="mb-1">State / Province</Label>
                        <Input
                            size="sm"
                            value={stateOrRegion}
                            onChange={(e) => setStateOrRegion(e.target.value)}
                            placeholder="e.g. Karnataka"
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">Country Code (ISO) *</Label>
                        <Input
                            size="sm"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                            placeholder="IN"
                            maxLength={3}
                            disabled={isSaving}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">Local Currency</Label>
                        <Input
                            size="sm"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                            placeholder="INR"
                            maxLength={3}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                {/* Delivery Estimate */}
                <div>
                    <Label className="mb-1">Delivery Estimate</Label>
                    <Input
                        size="sm"
                        value={deliveryEstimate}
                        onChange={(e) => setDeliveryEstimate(e.target.value)}
                        placeholder="Within 24 Hours"
                        disabled={isSaving}
                    />
                </div>

                {/* Postal Codes */}
                <div>
                    <Label className="mb-1">Postal Codes (Comma-separated or Hyphenated Ranges)</Label>
                    <Input
                        size="sm"
                        value={postalCodesStr}
                        onChange={(e) => setPostalCodesStr(e.target.value)}
                        placeholder="560001, 560002, 560001-560050"
                        disabled={isSaving}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Ranges auto-expand into individual sequential pincodes. Use <code className="text-blue-500">*</code> for whole region.
                    </p>
                </div>

                {/* Postal Code Prefixes */}
                <div>
                    <Label className="mb-1">Postal Code Prefixes (Wildcard Match)</Label>
                    <Input
                        size="sm"
                        value={postalCodePrefixesStr}
                        onChange={(e) => setPostalCodePrefixesStr(e.target.value)}
                        placeholder="560, 500"
                        disabled={isSaving}
                    />
                </div>

                {/* Active Switch */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                            Serviceable & Active
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            When enabled, customers can select this location in the storefront delivery switcher.
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        disabled={isSaving}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                </div>
            </Card>
        </div>
    );
}
