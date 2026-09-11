"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../lib/api";
import type { SeoEntityType } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Spinner,
} from "@ecommers/ui";
import {
    ArrowLeft,
    RefreshCw,
    Search,
    Wrench,
    Upload,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Globe,
    MapPin,
    FileSpreadsheet,
} from "lucide-react";

interface EntityOption {
    id: string;
    title: string;
    slug: string;
    status?: string;
}

interface MetadataRowItem {
    id: string;
    locationKey: string;
    locationName: string;
    locationType: string;
    currency?: string;
    slug: string;
    robots: string;
    updatedAt: string | Date;
    metaTitle?: string;
    metaDescription?: string;
    deliveryHighlight?: string;
    canonicalUrl?: string;
    keywords?: string[];
    isIndexed?: boolean;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    internalSection?: { title?: string; value?: string };
    bottomSection?: { title?: string; value?: string };
}

function formatDate(dateVal: string | Date | undefined): string {
    if (!dateVal) return "—";
    try {
        const d = new Date(dateVal);
        const dateStr = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const timeStr = d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        return `UPDATED\n${dateStr} • ${timeStr}`;
    } catch {
        return "—";
    }
}

function SeoMetadataTableContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Query params
    const initialType = (searchParams.get("type") || "PRODUCT").toUpperCase() as SeoEntityType;
    const initialId = searchParams.get("id") || "";

    const [entityType, setEntityType] = useState<SeoEntityType>(initialType);
    const [entities, setEntities] = useState<EntityOption[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>(initialId);
    const [isLoadingEntities, setIsLoadingEntities] = useState(false);

    // Table rows state
    const [rows, setRows] = useState<MetadataRowItem[]>([]);
    const [isLoadingRows, setIsLoadingRows] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [pageSize, setPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(1);


    // Fetch entity list when entityType changes
    const loadEntities = useCallback(async () => {
        setIsLoadingEntities(true);
        try {
            const list = await api.seo.listEntities(entityType);
            setEntities(list || []);
            if (list && list.length > 0) {
                // If initialId matches one of the entities, select it, otherwise default to first
                if (initialId && list.some((e) => e.id === initialId)) {
                    setSelectedEntityId(initialId);
                } else if (!selectedEntityId || !list.some((e) => e.id === selectedEntityId)) {
                    setSelectedEntityId(list[0].id);
                }
            } else {
                setSelectedEntityId("");
                setRows([]);
            }
        } catch (err) {
            console.error("Failed to load entities for SEO:", err);
            setEntities([]);
        } finally {
            setIsLoadingEntities(false);
        }
    }, [entityType, initialId, selectedEntityId]);

    useEffect(() => {
        loadEntities();
    }, [entityType]);

    // Fetch metadata rows when selectedEntityId changes or refresh clicked
    const loadRows = useCallback(async () => {
        if (!selectedEntityId) {
            setRows([]);
            return;
        }

        setIsLoadingRows(true);
        try {
            const result = await api.seo.getMetadataRows(entityType, selectedEntityId, searchQuery);
            setRows(result?.rows || []);
            setCurrentPage(1);
        } catch (err) {
            console.error("Failed to load metadata rows:", err);
            setRows([]);
        } finally {
            setIsLoadingRows(false);
        }
    }, [entityType, selectedEntityId, searchQuery]);

    useEffect(() => {
        if (selectedEntityId) {
            loadRows();
        }
    }, [selectedEntityId]);

    const selectedEntity = entities.find((e) => e.id === selectedEntityId);

    // Pagination calculations
    const totalEntries = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalEntries);
    const paginatedRows = rows.slice(startIndex, endIndex);

    return (
        <div className="space-y-4 pb-12">
            {/* Top Navigation & Entity Selectors */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] flex items-center justify-center text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors shadow-sm"
                        title="Go back"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            SEO Metadata Table
                        </h1>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                            <span>Home</span>
                            <span>›</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                SEO Metadata Table
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Right Dropdowns */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    {/* Entity Type Dropdown */}
                    <div className="relative">
                        <select
                            value={entityType}
                            onChange={(e) => {
                                setEntityType(e.target.value as SeoEntityType);
                                setCurrentPage(1);
                            }}
                            className="appearance-none text-xs font-semibold rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] pl-3.5 pr-8 py-2 text-slate-800 dark:text-neutral-200 shadow-sm hover:border-slate-300 dark:hover:border-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="PRODUCT">Product</option>
                            <option value="CATEGORY">Category</option>
                            <option value="COURSE">Course</option>
                        </select>
                        <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                    </div>

                    {/* Entity Selector Dropdown */}
                    <div className="relative min-w-[200px] max-w-[280px]">
                        <select
                            value={selectedEntityId}
                            onChange={(e) => setSelectedEntityId(e.target.value)}
                            disabled={isLoadingEntities || entities.length === 0}
                            className="w-full appearance-none truncate text-xs font-semibold rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#111111] pl-3.5 pr-8 py-2 text-slate-800 dark:text-neutral-200 shadow-sm hover:border-slate-300 dark:hover:border-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {entities.length === 0 ? (
                                <option value="">No {entityType.toLowerCase()}s found</option>
                            ) : (
                                entities.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.title}
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Main Data Container Card */}
            <Card className="bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800 shadow-sm rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30">
                    {/* Left: Show Entries Dropdown */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="text-xs font-medium rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>entries</span>
                    </div>

                    {/* Right: Actions & Search */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => loadRows()}
                            disabled={isLoadingRows}
                            className="w-8 h-8 p-0 rounded-md shrink-0 text-slate-600 dark:text-neutral-300"
                            title="Refresh table"
                        >
                            <RefreshCw size={13} className={isLoadingRows ? "animate-spin" : ""} />
                        </Button>

                        <div className="relative flex-1 sm:w-64">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") loadRows();
                                }}
                                placeholder={`Search ${entityType.toLowerCase()} metadata...`}
                                className="pl-8 text-xs h-8"
                            />
                            <Search
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/seo/bulk?type=${entityType}`)}
                            className="gap-1.5 h-8 text-xs font-semibold shrink-0"
                        >
                            <FileSpreadsheet size={13} />
                            <span>Bulk Update</span>
                        </Button>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/70 dark:bg-neutral-900/50">
                            <TableRow>
                                <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Robots
                                </TableHead>
                                <TableHead className="min-w-[160px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Location
                                </TableHead>
                                <TableHead className="min-w-[200px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Slug
                                </TableHead>
                                <TableHead className="w-[180px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Updated
                                </TableHead>
                                <TableHead className="w-[90px] text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingRows ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Spinner size="md" />
                                            <p className="text-xs">Loading SEO metadata rows...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-14 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <Globe size={24} className="text-slate-300 dark:text-neutral-600" />
                                            <p className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                                                No metadata records found
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Select a valid {entityType.toLowerCase()} to inspect and edit its SEO overrides.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRows.map((row) => {
                                    const isGlobal = row.locationKey.toUpperCase() === "GLOBAL";
                                    return (
                                        <TableRow
                                            key={row.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                                        >
                                            {/* ROBOTS */}
                                            <TableCell className="text-xs font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                                                <code className="text-[11px] font-mono bg-slate-100 dark:bg-neutral-800/80 px-1.5 py-0.5 rounded text-slate-800 dark:text-neutral-200">
                                                    {row.robots || "index, follow"}
                                                </code>
                                            </TableCell>

                                            {/* LOCATION */}
                                            <TableCell className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                                <div className="flex items-center gap-1.5">
                                                    {isGlobal ? (
                                                        <Globe size={13} className="text-blue-500 shrink-0" />
                                                    ) : (
                                                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                                                    )}
                                                    <span>{row.locationName}</span>
                                                </div>
                                            </TableCell>

                                            {/* SLUG */}
                                            <TableCell className="text-xs font-mono text-slate-600 dark:text-neutral-400">
                                                <span>{row.slug}</span>
                                            </TableCell>

                                            {/* UPDATED */}
                                            <TableCell className="text-[11px] text-slate-500 dark:text-neutral-400 whitespace-pre-line">
                                                {formatDate(row.updatedAt)}
                                            </TableCell>

                                            {/* ACTIONS */}
                                            <TableCell className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        router.push(`/seo/edit?type=${entityType}&id=${selectedEntityId}&location=${row.locationKey}`);
                                                    }}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shadow-sm"
                                                    title={`Edit SEO for ${row.locationName}`}
                                                >
                                                    <Wrench size={15} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-neutral-800/80 text-xs text-slate-500 dark:text-neutral-400">
                    <div>
                        Showing <span className="font-semibold text-slate-700 dark:text-neutral-200">{totalEntries === 0 ? 0 : startIndex + 1}</span> to{" "}
                        <span className="font-semibold text-slate-700 dark:text-neutral-200">{endIndex}</span> of{" "}
                        <span className="font-semibold text-slate-700 dark:text-neutral-200">{totalEntries}</span> entries
                    </div>

                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            Prev
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                                if (totalPages <= 7) return true;
                                if (page === 1 || page === totalPages) return true;
                                return Math.abs(page - currentPage) <= 1;
                            })
                            .map((page, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && page - prev > 1;

                                return (
                                    <React.Fragment key={page}>
                                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-7 h-7 text-xs font-semibold rounded transition-colors ${
                                                currentPage === page
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : "border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                );
                            })}

                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </Card>


        </div>
    );
}

export default function SeoMetadataPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center py-20">
                    <Spinner size="md" />
                </div>
            }
        >
            <SeoMetadataTableContent />
        </Suspense>
    );
}
