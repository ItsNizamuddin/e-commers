"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../../lib/api";
import type {
    CreateLocationInput,
    LocationType,
    BulkLocationUploadResult,
} from "@ecommers/types";
import { Card, Badge, Button, Input, Select, Label } from "@ecommers/ui";
import {
    ArrowLeft,
    MapPin,
    Upload,
    Save,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    FileText,
    RefreshCw,
    Sparkles,
    Layers,
    Plus,
} from "lucide-react";

const SAMPLE_CSV = `code,name,type,stateOrRegion,countryCode,currency,deliveryEstimate,postalCodes,postalCodePrefixes,isActive
BLR,Bangalore,CITY,Karnataka,IN,INR,Within 24 Hours,"560001-560020,560025,560034",560*,true
HYD,Hyderabad,CITY,Telangana,IN,INR,Within 24 Hours,"500001-500020,500032,500081",500*,true
MUM,Mumbai,CITY,Maharashtra,IN,INR,Within 24 Hours,"400001-400025",400*,true
DEL,Delhi NCR,CITY,Delhi,IN,INR,Within 24 Hours,"110001-110025",110*,true
US,United States,COUNTRY,All States,US,USD,3-5 Business Days,"*",*,true
AE,United Arab Emirates,COUNTRY,Dubai / Abu Dhabi,AE,AED,2-4 Business Days,"*",*,true`;

export default function NewLocationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") === "bulk" ? "bulk" : "single";

    // Active Tab: "single" or "bulk"
    const [activeTab, setActiveTab] = useState<"single" | "bulk">(initialTab);

    // ==========================================
    // SINGLE LOCATION FORM STATE
    // ==========================================
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<LocationType>("CITY");
    const [stateOrRegion, setStateOrRegion] = useState("");
    const [countryCode, setCountryCode] = useState("IN");
    const [currency, setCurrency] = useState("INR");
    const [deliveryEstimate, setDeliveryEstimate] = useState("Within 24 Hours");
    const [postalCodesStr, setPostalCodesStr] = useState("");
    const [postalCodePrefixesStr, setPostalCodePrefixesStr] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
    const [singleError, setSingleError] = useState<string | null>(null);
    const [singleSuccess, setSingleSuccess] = useState<string | null>(null);

    // ==========================================
    // BULK UPLOAD STATE
    // ==========================================
    const [bulkMode, setBulkMode] = useState<"UPSERT" | "REPLACE">("UPSERT");
    const [bulkMethod, setBulkMethod] = useState<"file" | "paste">("file");
    const [csvContent, setCsvContent] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedPreview, setParsedPreview] = useState<Array<Record<string, string>>>([]);

    const [isUploadingBulk, setIsUploadingBulk] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkResult, setBulkResult] = useState<BulkLocationUploadResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync tab if search param changes
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "bulk" || tab === "single") {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Handle Single Location Submit
    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSingleError(null);
        setSingleSuccess(null);

        if (!code.trim()) {
            setSingleError("Location code is required (e.g. BLR or US).");
            return;
        }
        if (!name.trim()) {
            setSingleError("Location name is required (e.g. Bangalore or United States).");
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

        setIsSubmittingSingle(true);
        try {
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
            setSingleSuccess(`Location "${payload.name}" (${payload.code}) created successfully!`);
            setTimeout(() => {
                router.push("/locations");
            }, 1200);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setSingleError(err.message);
            } else {
                setSingleError("Failed to create location.");
            }
        } finally {
            setIsSubmittingSingle(false);
        }
    };

    // Parse CSV Preview
    const parseCsvPreview = (text: string) => {
        try {
            const lines = text.trim().split("\n").filter(Boolean);
            if (lines.length < 2) {
                setParsedPreview([]);
                return;
            }
            const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            const previewRows: Array<Record<string, string>> = [];

            for (let i = 1; i < Math.min(lines.length, 6); i++) {
                const line = lines[i];
                const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
                const matches: string[] = [];
                let match;
                while ((match = regex.exec(line)) !== null) {
                    let val = match[1];
                    if (val === undefined) break;
                    val = val.replace(/^"|"$/g, "").trim();
                    matches.push(val);
                    if (regex.lastIndex >= line.length) break;
                }
                const rowObj: Record<string, string> = {};
                headers.forEach((h, idx) => {
                    rowObj[h] = matches[idx] || "";
                });
                previewRows.push(rowObj);
            }
            setParsedPreview(previewRows);
        } catch {
            setParsedPreview([]);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
            setBulkError("Please select a valid .csv file.");
            return;
        }
        setBulkError(null);
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = (e.target?.result as string) || "";
            setCsvContent(text);
            parseCsvPreview(text);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "serviceable_locations_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBulkUpload = async () => {
        if (!csvContent.trim()) {
            setBulkError("Please upload or paste CSV content before uploading.");
            return;
        }

        setIsUploadingBulk(true);
        setBulkError(null);
        setBulkResult(null);

        try {
            const res = await api.locations.bulkUpload(csvContent.trim(), bulkMode);
            setBulkResult(res);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setBulkError(err.message);
            } else {
                setBulkError("Failed to upload locations.");
            }
        } finally {
            setIsUploadingBulk(false);
        }
    };

    const resetBulk = () => {
        setCsvContent("");
        setFileName(null);
        setParsedPreview([]);
        setBulkError(null);
        setBulkResult(null);
    };

    return (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto pb-16">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/locations")}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Back to Serviceable Locations"
                    >
                        <ArrowLeft size={14} />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                            Add Serviceable Locations
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                            Add single delivery location or bulk ingest multiple cities and regional postal zones via CSV.
                        </p>
                    </div>
                </div>

                {/* Tabs Toggle: Single vs Bulk */}
                <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("single");
                            router.replace("/locations/new?tab=single");
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === "single"
                                ? "bg-white dark:bg-[#111111] text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <MapPin size={13} />
                        <span>Single Location</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("bulk");
                            router.replace("/locations/new?tab=bulk");
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === "bulk"
                                ? "bg-white dark:bg-[#111111] text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <Upload size={13} />
                        <span>Bulk Ingest (CSV)</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: SINGLE LOCATION FORM */}
            {activeTab === "single" && (
                <form onSubmit={handleSingleSubmit} className="space-y-4 animate-in fade-in-50 duration-150">
                    {singleSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{singleSuccess} Redirecting to locations table...</span>
                        </div>
                    )}

                    {singleError && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{singleError}</span>
                        </div>
                    )}

                    <Card className="p-4 sm:p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 space-y-4">
                        <div className="pb-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <MapPin size={13} />
                                </div>
                                <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                    Location Identity & Parameters
                                </h2>
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                                Fields marked * are required
                            </span>
                        </div>

                        {/* Code and Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <Label className="mb-1">Location Code (Unique ID) *</Label>
                                <Input
                                    size="sm"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. BLR, HYD, MUM, US"
                                    disabled={isSubmittingSingle}
                                />
                                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                    Used as URL slug for multi-location pages (e.g. /products/sweet/<strong>blr</strong>).
                                </p>
                            </div>
                            <div>
                                <Label className="mb-1">Location Type *</Label>
                                <Select
                                    size="sm"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as LocationType)}
                                    disabled={isSubmittingSingle}
                                    options={[
                                        { value: "CITY", label: "City (Urban Delivery Zone)" },
                                        { value: "COUNTRY", label: "Country (Regional / International)" },
                                        { value: "ZONE", label: "Zone / State" },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Name and State/Region */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <Label className="mb-1">Display Name *</Label>
                                <Input
                                    size="sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Bangalore, Hyderabad, United States"
                                    disabled={isSubmittingSingle}
                                />
                            </div>
                            <div>
                                <Label className="mb-1">State / Province / Region</Label>
                                <Input
                                    size="sm"
                                    value={stateOrRegion}
                                    onChange={(e) => setStateOrRegion(e.target.value)}
                                    placeholder="e.g. Karnataka, Telangana, Maharashtra"
                                    disabled={isSubmittingSingle}
                                />
                            </div>
                        </div>

                        {/* Country Code, Currency, Delivery Estimate */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div>
                                <Label className="mb-1">Country Code (ISO) *</Label>
                                <Input
                                    size="sm"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                                    placeholder="IN, US, AE"
                                    maxLength={3}
                                    disabled={isSubmittingSingle}
                                />
                            </div>
                            <div>
                                <Label className="mb-1">Local Currency</Label>
                                <Input
                                    size="sm"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                    placeholder="INR, USD, AED"
                                    maxLength={3}
                                    disabled={isSubmittingSingle}
                                />
                            </div>
                            <div>
                                <Label className="mb-1">Delivery Estimate</Label>
                                <Input
                                    size="sm"
                                    value={deliveryEstimate}
                                    onChange={(e) => setDeliveryEstimate(e.target.value)}
                                    placeholder="Within 24 Hours"
                                    disabled={isSubmittingSingle}
                                />
                            </div>
                        </div>

                        {/* Postal Codes & Ranges */}
                        <div>
                            <Label className="mb-1">Postal Codes (Comma-separated or Hyphenated Ranges)</Label>
                            <Input
                                size="sm"
                                value={postalCodesStr}
                                onChange={(e) => setPostalCodesStr(e.target.value)}
                                placeholder="e.g. 560001, 560002, 560001-560050, 560068"
                                disabled={isSubmittingSingle}
                            />
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                Range syntax (e.g. <code className="text-blue-600 dark:text-blue-400 font-mono">560001-560050</code>) auto-expands into sequential pincodes. Use <code className="text-blue-600 font-mono">*</code> for full territory coverage.
                            </p>
                        </div>

                        {/* Postal Code Prefixes */}
                        <div>
                            <Label className="mb-1">Postal Code Prefixes (Wildcard Match)</Label>
                            <Input
                                size="sm"
                                value={postalCodePrefixesStr}
                                onChange={(e) => setPostalCodePrefixesStr(e.target.value)}
                                placeholder="e.g. 560, 500, 400"
                                disabled={isSubmittingSingle}
                            />
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                Automatically matches any pincode beginning with these digits.
                            </p>
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
                                disabled={isSubmittingSingle}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer h-4 w-4"
                            />
                        </div>
                    </Card>

                    <div className="flex items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/locations")}
                            disabled={isSubmittingSingle}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmittingSingle}
                            className="gap-1.5 h-8 font-semibold shadow-xs"
                        >
                            <Save size={13} />
                            <span>{isSubmittingSingle ? "Creating Location..." : "Save Location"}</span>
                        </Button>
                    </div>
                </form>
            )}

            {/* TAB 2: BULK CSV INGESTION */}
            {activeTab === "bulk" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150">
                    {bulkResult ? (
                        /* Results summary card */
                        <Card className="p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 space-y-4">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                        Bulk Ingestion Completed Successfully
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        Processed {bulkResult.summary.totalRows} locations using strategy <Badge variant="success" size="sm">{bulkMode}</Badge>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Total Rows</span>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                        {bulkResult.summary.totalRows}
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Created</span>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                        +{bulkResult.summary.created}
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Updated</span>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                        {bulkResult.summary.updated}
                                    </div>
                                </div>
                                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Pincodes Indexed</span>
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                                        {bulkResult.summary.totalPincodesIndexed.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {bulkResult.errors.length > 0 && (
                                <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                                    <p className="font-semibold mb-1">Warnings ({bulkResult.errors.length}):</p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                                        {bulkResult.errors.slice(0, 5).map((err, idx) => (
                                            <li key={idx}>Row {err.row}: {err.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-neutral-800">
                                <Button type="button" variant="outline" size="sm" onClick={resetBulk}>
                                    Upload Another CSV
                                </Button>
                                <Button type="button" variant="primary" size="sm" onClick={() => router.push("/locations")}>
                                    View All Locations
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        /* Bulk Ingestion Controls */
                        <Card className="p-4 sm:p-5 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 space-y-4">
                            {/* Strategy & Download bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                                <div>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                        Ingestion Mode:
                                    </span>
                                    <div className="flex items-center gap-4 mt-1.5">
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bulkMode"
                                                value="UPSERT"
                                                checked={bulkMode === "UPSERT"}
                                                onChange={() => setBulkMode("UPSERT")}
                                                className="text-blue-600 focus:ring-0"
                                            />
                                            <span><strong>UPSERT</strong> (Safe merge: insert new & update existing)</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bulkMode"
                                                value="REPLACE"
                                                checked={bulkMode === "REPLACE"}
                                                onChange={() => setBulkMode("REPLACE")}
                                                className="text-blue-600 focus:ring-0"
                                            />
                                            <span><strong>REPLACE</strong> (Deactivate omitted)</span>
                                        </label>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="gap-1.5 text-xs h-8 shrink-0"
                                >
                                    <Download size={13} />
                                    <span>Download CSV Template</span>
                                </Button>
                            </div>

                            {/* Method Selector */}
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setBulkMethod("file")}
                                    className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${bulkMethod === "file"
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                        }`}
                                >
                                    Upload CSV File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkMethod("paste")}
                                    className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${bulkMethod === "paste"
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                        }`}
                                >
                                    Paste CSV Content
                                </button>
                            </div>

                            {/* Dropzone vs Paste */}
                            {bulkMethod === "file" ? (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-white dark:bg-[#111111]"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileSelect(f);
                                        }}
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2.5">
                                        <Upload size={20} />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                        {fileName ? fileName : "Click to select or drag and drop a .csv file"}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                        Supports postal code ranges like <code className="text-blue-600 dark:text-blue-400 font-mono">560001-560050</code> and wildcard prefixes like <code className="text-blue-600 dark:text-blue-400 font-mono">560*</code>
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <textarea
                                        rows={7}
                                        value={csvContent}
                                        onChange={(e) => {
                                            setCsvContent(e.target.value);
                                            parseCsvPreview(e.target.value);
                                        }}
                                        placeholder="Paste CSV rows with header: code,name,type,stateOrRegion,countryCode,currency,deliveryEstimate,postalCodes,postalCodePrefixes,isActive"
                                        className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0E0E0E] text-slate-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Parsed Preview Table */}
                            {parsedPreview.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                            <FileSpreadsheet size={13} />
                                            Data Preview (First {parsedPreview.length} rows)
                                        </span>
                                        <Badge variant="neutral" size="sm">
                                            Valid Format
                                        </Badge>
                                    </div>
                                    <div className="border border-slate-200 dark:border-neutral-800 rounded-lg overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                            <thead className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800 text-slate-500">
                                                <tr>
                                                    <th className="p-2">Code</th>
                                                    <th className="p-2">Name</th>
                                                    <th className="p-2">Type</th>
                                                    <th className="p-2">Region</th>
                                                    <th className="p-2">Postal Codes (Ranges Expanded)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                                {parsedPreview.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/50">
                                                        <td className="p-2 font-mono font-semibold text-slate-900 dark:text-white">
                                                            {row.code || "-"}
                                                        </td>
                                                        <td className="p-2 font-medium">{row.name || "-"}</td>
                                                        <td className="p-2">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-neutral-800">
                                                                {row.type || "CITY"}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 text-slate-500">{row.stateOrRegion || "-"}</td>
                                                        <td className="p-2 font-mono text-[10px] text-blue-600 dark:text-blue-400 truncate max-w-[240px]">
                                                            {row.postalCodes || row.postalCodePrefixes || "*"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {bulkError && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{bulkError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push("/locations")}
                                    disabled={isUploadingBulk}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleBulkUpload}
                                    disabled={isUploadingBulk || !csvContent.trim()}
                                    className="gap-1.5 h-8 font-semibold shadow-xs"
                                >
                                    {isUploadingBulk ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" />
                                            <span>Processing Batch...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={13} />
                                            <span>Start Bulk Ingestion ({bulkMode})</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
