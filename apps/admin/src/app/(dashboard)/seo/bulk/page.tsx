"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExportSeoCsvMutation, useImportSeoCsvMutation } from "@/store/api";
import type { BulkSeoUploadResult, SeoEntityType } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Textarea,
    Label,
    Spinner,
    toast,
} from "@ecommers/ui";
import {
    ArrowLeft,
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    FileText,
    RefreshCw,
    Sparkles,
    CheckSquare,
    Square,
    Sliders,
    ChevronRight,
    Search,
    Globe,
    Layers,
} from "lucide-react";

interface ExportFieldOption {
    id: string;
    label: string;
    description: string;
    category: "Meta" | "Local" | "Content";
}

const AVAILABLE_EXPORT_FIELDS: ExportFieldOption[] = [
    {
        id: "metaTitle",
        label: "Meta Title",
        description: "Primary search engine headline tag for Google and social crawlers",
        category: "Meta",
    },
    {
        id: "metaDescription",
        label: "Meta Description",
        description: "Informative snippet summary displayed under the search title",
        category: "Meta",
    },
    {
        id: "metaRobots",
        label: "Robots Indexing Tag",
        description: "Directives such as 'index, follow' or 'noindex, follow'",
        category: "Meta",
    },
    {
        id: "canonicalUrl",
        label: "Canonical URL",
        description: "Preferred search canonical link for deduplicating content",
        category: "Meta",
    },
    {
        id: "keywords",
        label: "Keywords",
        description: "Comma-separated target keyword terms and search phrases",
        category: "Meta",
    },
    {
        id: "deliveryHighlight",
        label: "Delivery Highlight Badge",
        description: "City/regional badge (e.g. 'Available in Bangalore')",
        category: "Local",
    },
    {
        id: "internalSectionTitle",
        label: "Internal Section Heading",
        description: "Heading text for in-body product or category SEO section",
        category: "Content",
    },
    {
        id: "internalSectionValue",
        label: "Internal Section HTML Content",
        description: "Rich HTML paragraphs, lists, and tables inside description area",
        category: "Content",
    },
    {
        id: "bottomSectionTitle",
        label: "Bottom FAQ Heading",
        description: "Heading text for footer SEO section and local FAQs",
        category: "Content",
    },
    {
        id: "bottomSectionValue",
        label: "Bottom FAQ HTML Content",
        description: "Rich HTML content for deep indexation and FAQ rich snippets",
        category: "Content",
    },
];

const SAMPLE_CSV = `entityType,entityId,entitySlug,entityTitle,locationKey,locationName,locationType,metaTitle,metaDescription,deliveryHighlight,keywords,canonicalUrl
PRODUCT,,sweet-product,Sweet product,GLOBAL,Global (Default),GLOBAL,Sweet product | Buy Online,"Authentic traditional sweet product made fresh with pure ghee.",,"sweets, traditional",https://yourstore.com/products/sweet-product
PRODUCT,,sweet-product,Sweet product,bangalore,Bangalore,CITY,Sweet product in Bangalore | Fast Delivery,"Order fresh sweet product in Bangalore. Express doorstep delivery across Bangalore.",Available in Bangalore,"sweet bangalore, sweets",https://yourstore.com/products/sweet-product/bangalore`;

function BulkSeoPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialType = (searchParams.get("type") || "PRODUCT").toUpperCase() as SeoEntityType;
    const [entityType, setEntityType] = useState<SeoEntityType>(initialType);
    const [activeTab, setActiveTab] = useState<"export" | "import">("export");

    // -------------------------------------------------------------
    // EXPORT STATE & HANDLERS
    // -------------------------------------------------------------
    const [selectedFields, setSelectedFields] = useState<string[]>(
        AVAILABLE_EXPORT_FIELDS.map((f) => f.id)
    );
    const [exportCsv, { isLoading: isExporting }] = useExportSeoCsvMutation();

    const handleToggleField = (fieldId: string) => {
        setSelectedFields((prev) =>
            prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
        );
    };

    const handleSelectAll = () => {
        setSelectedFields(AVAILABLE_EXPORT_FIELDS.map((f) => f.id));
    };

    const handleDeselectAll = () => {
        setSelectedFields([]);
    };

    const handleExecuteExport = async () => {
        if (selectedFields.length === 0) {
            toast.error("Please select at least one field to export.");
            return;
        }

        try {
            const csvText = await exportCsv({ entityType, fields: selectedFields }).unwrap();
            const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const dateStr = new Date().toISOString().split("T")[0];
            link.setAttribute(
                "download",
                `${entityType.toLowerCase()}-seo-export-${dateStr}.csv`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success(`Exported ${entityType.toLowerCase()} SEO data successfully!`);
        } catch (err: any) {
            console.error("Failed to export SEO data:", err);
            toast.error(err?.data?.message || err?.message || "Failed to export SEO data.");
        }
    };

    // -------------------------------------------------------------
    // IMPORT STATE & HANDLERS
    // -------------------------------------------------------------
    const [importInputMode, setImportInputMode] = useState<"file" | "paste">("file");
    const [csvContent, setCsvContent] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsedPreview, setParsedPreview] = useState<Array<Record<string, string>>>([]);
    const [importCsv, { isLoading: isUploading }] = useImportSeoCsvMutation();
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<BulkSeoUploadResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseCsvPreview = (text: string) => {
        try {
            const lines = text.trim().split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                setParsedPreview([]);
                return;
            }
            const firstLine = lines[0] ?? "";
            const headers = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            const previewRows: Array<Record<string, string>> = [];

            for (let i = 1; i < Math.min(lines.length, 6); i++) {
                const line = lines[i] ?? "";
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
            setUploadError("Please select a valid .csv file.");
            return;
        }
        setUploadError(null);
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
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `seo_bulk_template_${entityType.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExecuteImport = async () => {
        if (!csvContent.trim()) {
            setUploadError("Please select a CSV file or paste content before importing.");
            return;
        }

        setUploadError(null);
        setUploadResult(null);

        try {
            const res = await importCsv({ csvContent: csvContent.trim() }).unwrap();
            setUploadResult(res);
            toast.success(`Import complete! Processed ${res.totalRows} rows.`);
        } catch (err: any) {
            console.error("Failed to import CSV:", err);
            const msg = err?.data?.message || err?.message || "Failed to import SEO CSV.";
            setUploadError(msg);
            toast.error(msg);
        }
    };

    const resetImportState = () => {
        setCsvContent("");
        setFileName(null);
        setParsedPreview([]);
        setUploadError(null);
        setUploadResult(null);
    };

    return (
        <div className="space-y-6 pb-24 max-w-6xl mx-auto">
            {/* Header with breadcrumbs & entity toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push(`/seo?type=${entityType}`)}
                        className="w-9 h-9 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
                        title="Return to SEO Table"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Bulk SEO Management
                            </h1>
                            <Badge variant="primary" size="sm">
                                {entityType}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                            <span>Home</span>
                            <ChevronRight size={12} />
                            <button
                                type="button"
                                onClick={() => router.push(`/seo?type=${entityType}`)}
                                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                SEO Metadata Table
                            </button>
                            <ChevronRight size={12} />
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                Bulk Operations
                            </span>
                        </div>
                    </div>
                </div>

                {/* Entity Selector Switcher */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        Target Entity:
                    </span>
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-900 p-1 rounded-xl border border-slate-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setEntityType("PRODUCT")}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                entityType === "PRODUCT"
                                    ? "bg-white dark:bg-[#151515] text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                            }`}
                        >
                            Products
                        </button>
                        <button
                            type="button"
                            onClick={() => setEntityType("CATEGORY")}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                entityType === "CATEGORY"
                                    ? "bg-white dark:bg-[#151515] text-blue-600 dark:text-blue-400 shadow-xs"
                                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                            }`}
                        >
                            Categories
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs for Bulk Actions */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] px-4 rounded-t-xl">
                <button
                    type="button"
                    onClick={() => setActiveTab("export")}
                    className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "export"
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                    <Download size={14} />
                    <span>Export SEO Data</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                        Custom Fields
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("import")}
                    className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "import"
                            ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                >
                    <Upload size={14} />
                    <span>Import & Bulk Upload</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                        Safe UPSERT
                    </span>
                </button>
            </div>

            {/* ======================================================== */}
            {/* TAB 1: CUSTOM FIELD EXPORT */}
            {/* ======================================================== */}
            {activeTab === "export" && (
                <div className="space-y-6 animate-in fade-in-50 duration-150">
                    <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-6">
                        {/* Header description */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Export {entityType.toLowerCase()} SEO Metadata to CSV
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                                    Select the specific fields you want to export. Only checked fields will be included in the exported spreadsheet.
                                </p>
                            </div>

                            {/* Select All / Deselect All */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="gap-1.5 text-xs font-semibold h-8"
                                >
                                    <CheckSquare size={13} />
                                    <span>Select All</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDeselectAll}
                                    className="gap-1.5 text-xs font-semibold h-8"
                                >
                                    <Square size={13} />
                                    <span>Deselect All</span>
                                </Button>
                            </div>
                        </div>

                        {/* Always Included Identification Callout */}
                        <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2.5">
                            <Sliders size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                                <span className="font-semibold">Identification Columns Included Automatically:</span>{" "}
                                <code className="text-[11px] font-mono bg-blue-100/80 dark:bg-blue-900/40 px-1 py-0.5 rounded">
                                    entityType, entityId, entitySlug, entityTitle, locationKey, locationName, locationType
                                </code>{" "}
                                — guaranteeing that any exported CSV can always be safely edited and re-imported!
                            </div>
                        </div>

                        {/* Selectable Fields Grid */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Select Fields to Export:
                                </span>
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    {selectedFields.length} of {AVAILABLE_EXPORT_FIELDS.length} fields selected
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {AVAILABLE_EXPORT_FIELDS.map((field) => {
                                    const isChecked = selectedFields.includes(field.id);
                                    return (
                                        <div
                                            key={field.id}
                                            onClick={() => handleToggleField(field.id)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                                isChecked
                                                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-xs"
                                                    : "bg-white dark:bg-[#141414] border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleToggleField(field.id)}
                                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-neutral-200">
                                                        {field.label}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {field.id}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                                                    {field.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Export Action Footer */}
                        <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-400">
                                Output format: standard CSV (RFC 4180 UTF-8 with quoted strings)
                            </span>

                            <Button
                                type="button"
                                variant="primary"
                                size="md"
                                onClick={handleExecuteExport}
                                disabled={isExporting || selectedFields.length === 0}
                                className="gap-2 font-bold px-5"
                            >
                                {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                <span>{isExporting ? "Generating CSV..." : "Download CSV Export"}</span>
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: IMPORT & BULK UPLOAD */}
            {/* ======================================================== */}
            {activeTab === "import" && (
                <div className="space-y-6 animate-in fade-in-50 duration-150">
                    {uploadResult ? (
                        /* Result Summary View */
                        <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-6 animate-in zoom-in-95 duration-150">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={22} />
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                        Bulk SEO Import Completed Successfully
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                                        Processed {uploadResult.totalRows} rows across {uploadResult.updatedEntitiesCount + uploadResult.createdCount} entities.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-xs text-slate-500 dark:text-neutral-400 font-medium">Total Rows Processed</span>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{uploadResult.totalRows}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Updated Entities</span>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{uploadResult.updatedEntitiesCount}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center">
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">New Entities Added</span>
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{uploadResult.createdCount}</div>
                                </div>
                            </div>

                            {uploadResult.errors.length > 0 && (
                                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                    <p className="font-semibold">Notice Warnings ({uploadResult.errors.length}):</p>
                                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                                        {uploadResult.errors.map((err, idx) => (
                                            <li key={idx}>
                                                {err.row > 0 ? `Row ${err.row}: ` : ""}{err.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-neutral-800">
                                <Button type="button" variant="outline" size="sm" onClick={resetImportState}>
                                    Upload Another CSV
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => router.push(`/seo?type=${entityType}`)}
                                    className="gap-1.5"
                                >
                                    <span>View in SEO Table</span>
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        /* Standard Upload Form */
                        <Card className="p-6 bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 rounded-xl shadow-sm space-y-6">
                            {/* Safe Ingestion Info Banner (No REPLACE) */}
                            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                    <div>
                                        <span className="font-bold">Safe Ingestion Mode (UPSERT):</span>{" "}
                                        Matched rows in your CSV will be updated or created. All existing locations and products in the database not mentioned in your file remain safe and untouched.
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="text-xs shrink-0 font-semibold gap-1.5 h-7"
                                >
                                    <Download size={12} />
                                    <span>Blank Template</span>
                                </Button>
                            </div>

                            {/* Sub-Tabs: File Upload vs Paste CSV */}
                            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setImportInputMode("file")}
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                        importInputMode === "file"
                                            ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                            : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                                    }`}
                                >
                                    <Upload size={13} />
                                    <span>Upload CSV File</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportInputMode("paste")}
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                        importInputMode === "paste"
                                            ? "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                            : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                                    }`}
                                >
                                    <FileText size={13} />
                                    <span>Paste Raw CSV</span>
                                </button>
                            </div>

                            {/* Upload Area */}
                            {importInputMode === "file" ? (
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-neutral-900/30"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileSelect(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    <div className="flex flex-col items-center gap-2.5">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                                            <FileSpreadsheet size={24} />
                                        </div>
                                        {fileName ? (
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{fileName}</p>
                                                <p className="text-xs text-emerald-600 mt-0.5">File ready for import. Click or drop to replace.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    Drag and drop your SEO CSV here, or <span className="text-blue-600 underline">browse</span>
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    Supports multi-city & global SEO rows per product or category
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <Textarea
                                        rows={7}
                                        value={csvContent}
                                        onChange={(e) => {
                                            setCsvContent(e.target.value);
                                            parseCsvPreview(e.target.value);
                                        }}
                                        placeholder={SAMPLE_CSV}
                                        className="font-mono text-xs"
                                    />
                                </div>
                            )}

                            {uploadError && (
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            {/* Live Parsed Preview */}
                            {parsedPreview.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="font-bold text-slate-700 dark:text-neutral-300">
                                            Data Validation Preview (First {parsedPreview.length} rows):
                                        </span>
                                        <Badge variant="neutral" size="sm">Valid CSV Structure</Badge>
                                    </div>
                                    <div className="overflow-x-auto border border-slate-200 dark:border-neutral-800 rounded-xl max-h-56">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800">
                                                    <th className="py-2 px-3 font-semibold text-slate-600 dark:text-neutral-400">Identifier</th>
                                                    <th className="py-2 px-3 font-semibold text-slate-600 dark:text-neutral-400">Location</th>
                                                    <th className="py-2 px-3 font-semibold text-slate-600 dark:text-neutral-400">Meta Title</th>
                                                    <th className="py-2 px-3 font-semibold text-slate-600 dark:text-neutral-400">Meta Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                                {parsedPreview.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40">
                                                        <td className="py-2 px-3 font-mono text-[11px] text-blue-600">
                                                            {row.entitySlug || row.entityId || "N/A"}
                                                        </td>
                                                        <td className="py-2 px-3 font-semibold">
                                                            <Badge variant={row.locationKey === "GLOBAL" ? "neutral" : "primary"} size="sm">
                                                                {row.locationName || row.locationKey}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-2 px-3 truncate max-w-[200px]">{row.metaTitle || "—"}</td>
                                                        <td className="py-2 px-3 truncate max-w-[250px] text-slate-500">{row.metaDescription || "—"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Submit Import Action */}
                            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetImportState}
                                    disabled={isUploading}
                                >
                                    Clear
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="md"
                                    onClick={handleExecuteImport}
                                    disabled={isUploading || !csvContent.trim()}
                                    className="gap-2 font-bold px-5"
                                >
                                    {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                    <span>{isUploading ? "Importing Data..." : "Execute Bulk Upload"}</span>
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}


        </div>
    );
}

export default function BulkSeoPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-24">
                    <Spinner size="lg" />
                </div>
            }
        >
            <BulkSeoPageContent />
        </Suspense>
    );
}
