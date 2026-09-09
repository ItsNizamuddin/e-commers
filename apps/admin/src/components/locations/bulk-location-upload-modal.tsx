"use client";

import React, { useState, useRef } from "react";
import { Modal, Button, Badge } from "@ecommers/ui";
import { api } from "../../lib/api";
import type { BulkLocationUploadResult } from "@ecommers/types";
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    FileText,
    RefreshCw,
    Layers,
} from "lucide-react";

export interface BulkLocationUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const SAMPLE_CSV = `code,name,type,stateOrRegion,country,countryCode,currency,postalCodes,postalCodePrefixes,isActive
BLR,Bangalore,CITY,Karnataka,India,IN,INR,"560001-560020,560025,560034",560*,true
HYD,Hyderabad,CITY,Telangana,India,IN,INR,"500001-500020,500032,500081",500*,true
MUM,Mumbai,CITY,Maharashtra,India,IN,INR,"400001-400025",400*,true
DEL,Delhi NCR,CITY,Delhi,India,IN,INR,"110001-110025",110*,true
US,United States,COUNTRY,All States,United States,US,USD,"*",*,true
AE,United Arab Emirates,COUNTRY,Dubai / Abu Dhabi,UAE,AE,AED,"*",*,true`;

export function BulkLocationUploadModal({
    isOpen,
    onClose,
    onSuccess,
}: BulkLocationUploadModalProps) {
    const [mode, setMode] = useState<"UPSERT" | "REPLACE">("UPSERT");
    const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
    const [csvContent, setCsvContent] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedPreview, setParsedPreview] = useState<Array<Record<string, string>>>([]);

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkLocationUploadResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                // Simple regex split considering quotes
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
            setError("Please select a valid .csv file.");
            return;
        }
        setError(null);
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

    const handleUpload = async () => {
        if (!csvContent.trim()) {
            setError("Please upload or paste CSV content before uploading.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const res = await api.locations.bulkUpload(csvContent.trim(), mode);
            setResult(res);
            if (onSuccess) {
                onSuccess();
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to upload locations.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    const resetState = () => {
        setCsvContent("");
        setFileName(null);
        setParsedPreview([]);
        setError(null);
        setResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Bulk Ingest Serviceable Locations"
            description="Upload multi-city or multi-country delivery coverage with atomic bulk ingestion and postal code range expansion."
            maxWidth="lg"
        >
            <div className="space-y-4">
                {/* Result Summary Screen */}
                {result ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                    Bulk Ingestion Successful
                                </h3>
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    Processed {result.summary.totalRows} location entries using mode <Badge variant="success" size="sm">{mode}</Badge>
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium">Total Rows</span>
                                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{result.summary.totalRows}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Created</span>
                                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{result.summary.created}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Updated</span>
                                <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{result.summary.updated}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Postal Codes</span>
                                <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                                    {result.summary.totalPincodesIndexed.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                                <p className="font-semibold mb-1">Warnings ({result.errors.length}):</p>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                                    {result.errors.slice(0, 5).map((err, idx) => (
                                        <li key={idx}>Row {err.row}: {err.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                            <Button type="button" variant="outline" size="sm" onClick={resetState}>
                                Upload Another File
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={handleClose}>
                                Done
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Ingestion Mode and Template Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                            <div>
                                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                                    Ingestion Strategy:
                                </label>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="UPSERT"
                                            checked={mode === "UPSERT"}
                                            onChange={() => setMode("UPSERT")}
                                            className="text-blue-600 focus:ring-0"
                                        />
                                        <span><strong>UPSERT</strong> (Safe: Insert new & update existing)</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mode"
                                            value="REPLACE"
                                            checked={mode === "REPLACE"}
                                            onChange={() => setMode("REPLACE")}
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

                        {/* Method Tabs: File Upload vs Direct Paste */}
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab("file")}
                                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                                    activeTab === "file"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                }`}
                            >
                                Upload CSV File
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("paste")}
                                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                                    activeTab === "paste"
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                                        : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                }`}
                            >
                                Paste CSV Text
                            </button>
                        </div>

                        {/* File Upload Area */}
                        {activeTab === "file" ? (
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-[#111111]"
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
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                                    <Upload size={18} />
                                </div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {fileName ? fileName : "Click to select or drag and drop a .csv file"}
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                    Supports ranges like <code className="text-blue-600 font-mono">560001-560050</code> and wildcard prefixes like <code className="text-blue-600 font-mono">560*</code>
                                </p>
                            </div>
                        ) : (
                            <div>
                                <textarea
                                    rows={6}
                                    value={csvContent}
                                    onChange={(e) => {
                                        setCsvContent(e.target.value);
                                        parseCsvPreview(e.target.value);
                                    }}
                                    placeholder="Paste raw CSV content with header: code,name,type,stateOrRegion,country,countryCode,currency,postalCodes,postalCodePrefixes,isActive"
                                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-[#0E0E0E] text-slate-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                                />
                            </div>
                        )}

                        {/* Client-Side Parsed Preview */}
                        {parsedPreview.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <FileSpreadsheet size={13} />
                                        Data Preview (First {parsedPreview.length} rows)
                                    </span>
                                    <Badge variant="neutral" size="sm">
                                        Valid Syntax Detected
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
                                                    <td className="p-2 text-slate-500">{row.stateOrRegion || row.country || "-"}</td>
                                                    <td className="p-2 font-mono text-[10px] text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                                                        {row.postalCodes || row.postalCodePrefixes || "*"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Footer Controls */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-neutral-800">
                            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isUploading}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={handleUpload}
                                disabled={isUploading || !csvContent.trim()}
                                className="gap-1.5"
                            >
                                {isUploading ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span>Processing Batch...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={13} />
                                        <span>Start Bulk Upload ({mode})</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
