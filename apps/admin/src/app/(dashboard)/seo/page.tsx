"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    useListSeoEntitiesQuery,
    useGetSeoMetadataRowsQuery,
} from "../../../store/api";
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
    Pagination,
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
    const [selectedEntityId, setSelectedEntityId] = useState<string>(initialId);
    const [searchQuery, setSearchQuery] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    // Pagination
    const [pageSize, setPageSize] = useState<number>(15);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const {
        data: entities = [],
        isLoading: isLoadingEntities,
    } = useListSeoEntitiesQuery({ entityType });

    useEffect(() => {
        if (entities.length > 0) {
            if (initialId && entities.some((e) => e.id === initialId)) {
                setSelectedEntityId(initialId);
            } else if (!selectedEntityId || !entities.some((e) => e.id === selectedEntityId)) {
                setSelectedEntityId(entities[0].id);
            }
        } else {
            setSelectedEntityId("");
        }
    }, [entities, initialId, selectedEntityId]);

    const {
        data: rowsData,
        isLoading: isLoadingRowsQuery,
        isFetching: isFetchingRows,
        refetch: refetchRows,
    } = useGetSeoMetadataRowsQuery(
        { entityType, entityId: selectedEntityId, search: appliedSearch },
        { skip: !selectedEntityId }
    );

    const rows = rowsData?.rows || [];
    const isLoadingRows = isLoadingRowsQuery || isFetchingRows;

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
            <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
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
                            <option value={15}>15</option>
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
                            onClick={() => {
                                setAppliedSearch(searchQuery);
                                refetchRows();
                            }}
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
                                    if (e.key === "Enter") {
                                        setAppliedSearch(searchQuery);
                                        setCurrentPage(1);
                                    }
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
                <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                    <Table className="border-none rounded-none">
                        <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
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
                                <TableHead className="min-w-[200px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Meta Title
                                </TableHead>
                                <TableHead className="min-w-[240px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Meta Description
                                </TableHead>
                                <TableHead className="min-w-[160px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Canonical URL
                                </TableHead>
                                <TableHead className="min-w-[140px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                                    Keywords
                                </TableHead>
                                <TableHead className="w-[90px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 text-center">
                                    Status
                                </TableHead>
                                <TableHead className="w-[110px] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 text-right pr-4">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingRows ? (
                                <TableRow noHover>
                                    <TableCell colSpan={10} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Spinner size="md" />
                                            <span className="text-xs text-slate-400">
                                                Loading metadata rows...
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRows.length === 0 ? (
                                <TableRow noHover>
                                    <TableCell colSpan={10} className="py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                                            <Globe size={24} className="opacity-40 mb-1" />
                                            <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                                                No SEO metadata rows found
                                            </span>
                                            <span className="text-[11px]">
                                                {selectedEntity
                                                    ? `Generate metadata for "${selectedEntity.title}" via Bulk Update`
                                                    : "Select an entity above to view its regional metadata"}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRows.map((row: MetadataRowItem) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50 transition-colors text-xs"
                                    >
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    row.robots?.includes("noindex")
                                                        ? "danger"
                                                        : "success"
                                                }
                                                size="sm"
                                                className="font-mono text-[10px]"
                                            >
                                                {row.robots || "INDEX, FOLLOW"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-neutral-200">
                                                <MapPin
                                                    size={12}
                                                    className="text-slate-400 shrink-0"
                                                />
                                                <span>{row.locationName}</span>
                                                <span className="text-[10px] text-slate-400 uppercase">
                                                    ({row.locationType})
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                                                /{row.slug}
                                            </code>
                                        </TableCell>
                                        <TableCell className="whitespace-pre-line text-[11px] text-slate-400 font-mono">
                                            {formatDate(row.updatedAt)}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-slate-700 dark:text-neutral-300">
                                            {row.metaTitle || "—"}
                                        </TableCell>
                                        <TableCell className="max-w-[240px] truncate text-slate-500 dark:text-neutral-400">
                                            {row.metaDescription || "—"}
                                        </TableCell>
                                        <TableCell className="max-w-[160px] truncate text-slate-500 dark:text-neutral-400 font-mono text-[11px]">
                                            {row.canonicalUrl || "—"}
                                        </TableCell>
                                        <TableCell className="max-w-[140px] truncate text-slate-500 dark:text-neutral-400">
                                            {row.keywords?.length
                                                ? row.keywords.join(", ")
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant={
                                                    row.isIndexed === false
                                                        ? "neutral"
                                                        : "success"
                                                }
                                                size="sm"
                                            >
                                                {row.isIndexed === false ? "Draft" : "Live"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    router.push(
                                                        `/seo/${row.id}/edit?type=${entityType}&entityId=${selectedEntityId}`
                                                    )
                                                }
                                                className="h-7 text-xs px-2.5 font-semibold"
                                            >
                                                Edit Row
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pinned Pagination Footer */}
                {totalEntries > 0 && (
                    <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                        <Pagination
                            page={currentPage}
                            totalPages={totalPages}
                            totalItems={totalEntries}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
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
