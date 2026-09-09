"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Select, Label } from "@ecommers/ui";
import { api } from "../../lib/api";
import type { LocationResponse, CreateLocationInput, UpdateLocationInput } from "@ecommers/types";
import { MapPin, AlertCircle, Save } from "lucide-react";

export interface LocationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    location?: LocationResponse | null;
    onSuccess: () => void;
}

export function LocationFormModal({
    isOpen,
    onClose,
    location,
    onSuccess,
}: LocationFormModalProps) {
    const isEdit = Boolean(location);

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<"CITY" | "COUNTRY" | "ZONE">("CITY");
    const [stateOrRegion, setStateOrRegion] = useState("");
    const [countryCode, setCountryCode] = useState("IN");
    const [currency, setCurrency] = useState("INR");
    const [deliveryEstimate, setDeliveryEstimate] = useState("Within 24 Hours");
    const [postalCodesStr, setPostalCodesStr] = useState("");
    const [postalCodePrefixesStr, setPostalCodePrefixesStr] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (location) {
            setCode(location.code);
            setName(location.name);
            setType(location.type);
            setStateOrRegion(location.stateOrRegion || "");
            setCountryCode(location.countryCode);
            setCurrency(location.currency || "INR");
            setDeliveryEstimate(location.deliveryEstimate || "Within 24 Hours");
            setPostalCodesStr((location.postalCodes || []).join(", "));
            setPostalCodePrefixesStr((location.postalCodePrefixes || []).join(", "));
            setIsActive(location.isActive);
        } else {
            setCode("");
            setName("");
            setType("CITY");
            setStateOrRegion("");
            setCountryCode("IN");
            setCurrency("INR");
            setDeliveryEstimate("Within 24 Hours");
            setPostalCodesStr("");
            setPostalCodePrefixesStr("");
            setIsActive(true);
        }
        setError(null);
    }, [location, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!code.trim()) {
            setError("Location code is required (e.g. BLR or US).");
            return;
        }
        if (!name.trim()) {
            setError("Location name is required (e.g. Bangalore or United States).");
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

        setIsSubmitting(true);
        try {
            if (isEdit && location) {
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
                await api.locations.update(location.id, payload);
            } else {
                const payload: CreateLocationInput = {
                    code: code.trim().toUpperCase(),
                    name: name.trim(),
                    type,
                    stateOrRegion: stateOrRegion.trim() || undefined,
                    countryCode: countryCode.trim().toUpperCase(),
                    currency: currency.trim().toUpperCase() || "INR",
                    deliveryEstimate: deliveryEstimate.trim() || "Within 24 Hours",
                    postalCodes,
                    postalCodePrefixes,
                    isActive,
                };
                await api.locations.create(payload);
            }

            onSuccess();
            onClose();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to save location.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Location: ${location?.name}` : "Add Serviceable Location"}
            description="Configure city or country delivery coverage and routing parameters."
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Code and Type */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="mb-1">Code (Unique Identifier) *</Label>
                        <Input
                            size="sm"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. BLR, HYD, US"
                            disabled={isEdit || isSubmitting}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">Location Type *</Label>
                        <Select
                            size="sm"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            disabled={isSubmitting}
                            options={[
                                { value: "CITY", label: "City (Urban Hub)" },
                                { value: "COUNTRY", label: "Country (Regional / International)" },
                                { value: "ZONE", label: "Zone / State" },
                            ]}
                        />
                    </div>
                </div>

                {/* Name and State */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="mb-1">Location Name *</Label>
                        <Input
                            size="sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bangalore"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <Label className="mb-1">State / Province</Label>
                        <Input
                            size="sm"
                            value={stateOrRegion}
                            onChange={(e) => setStateOrRegion(e.target.value)}
                            placeholder="e.g. Karnataka"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Delivery Estimate, Country Code, and Currency */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <Label className="mb-1">Delivery Estimate</Label>
                        <Input
                            size="sm"
                            value={deliveryEstimate}
                            onChange={(e) => setDeliveryEstimate(e.target.value)}
                            placeholder="Within 24 Hours"
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Postal Code Ranges */}
                <div>
                    <Label className="mb-1">Postal Codes (Comma-separated or Ranges)</Label>
                    <Input
                        size="sm"
                        value={postalCodesStr}
                        onChange={(e) => setPostalCodesStr(e.target.value)}
                        placeholder="e.g. 560001, 560002, 560001-560050"
                        disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Enter specific pincodes or hyphenated ranges. For country-wide coverage, use <code className="text-blue-500">*</code>.
                    </p>
                </div>

                {/* Postal Code Prefixes */}
                <div>
                    <Label className="mb-1">Postal Code Prefixes (Wildcards)</Label>
                    <Input
                        size="sm"
                        value={postalCodePrefixesStr}
                        onChange={(e) => setPostalCodePrefixesStr(e.target.value)}
                        placeholder="e.g. 560, 500"
                        disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Matches all postal codes beginning with these digits.
                    </p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="location-active"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        disabled={isSubmitting}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="location-active" className="text-xs text-slate-700 dark:text-neutral-300 cursor-pointer font-medium">
                        Serviceable & Active (Show in storefront delivery selector)
                    </label>
                </div>

                {error && (
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="gap-1.5">
                        <Save size={13} />
                        <span>{isEdit ? "Update Location" : "Create Location"}</span>
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
