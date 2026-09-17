"use client";

import React, { useState, useMemo } from "react";
import { useGetAuditLogsQuery } from "../../../store/api";
import type { AuditLogEntry, AuditLogListResponse } from "@ecommers/types";
import {
    Card,
    Badge,
    Spinner,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Button,
    Modal,
    Input,
    Select,
    TableAction,
    TableActionGroup,
    Pagination,
} from "@ecommers/ui";
import {
    ScrollText,
    RefreshCw,
    Search,
    ShieldCheck,
    Code2,
    Copy,
    Check,
    Eye,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Globe,
    Terminal,
    User,
    SlidersHorizontal,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

// Helper to format relative timestamps
function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Action color helper
function getActionBadgeStyle(action: string): { bg: string; text: string; border: string } {
    if (action.startsWith("AUTH_")) {
        return {
            bg: "bg-indigo-500/10 dark:bg-indigo-950/40",
            text: "text-indigo-600 dark:text-indigo-400",
            border: "border-indigo-200 dark:border-indigo-800/40",
        };
    }
    if (action.startsWith("STAFF_")) {
        return {
            bg: "bg-purple-500/10 dark:bg-purple-950/40",
            text: "text-purple-600 dark:text-purple-400",
            border: "border-purple-200 dark:border-purple-800/40",
        };
    }
    if (action.startsWith("PRODUCT_")) {
        if (action.includes("DELETED")) {
            return {
                bg: "bg-rose-500/10 dark:bg-rose-950/40",
                text: "text-rose-600 dark:text-rose-400",
                border: "border-rose-200 dark:border-rose-800/40",
            };
        }
        return {
            bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
            text: "text-emerald-600 dark:text-emerald-400",
            border: "border-emerald-200 dark:border-emerald-800/40",
        };
    }
    if (action.startsWith("CATEGORY_")) {
        if (action.includes("DELETED")) {
            return {
                bg: "bg-rose-500/10 dark:bg-rose-950/40",
                text: "text-rose-600 dark:text-rose-400",
                border: "border-rose-200 dark:border-rose-800/40",
            };
        }
        return {
            bg: "bg-sky-500/10 dark:bg-sky-950/40",
            text: "text-sky-600 dark:text-sky-400",
            border: "border-sky-200 dark:border-sky-800/40",
        };
    }
    if (action.startsWith("SEO_")) {
        return {
            bg: "bg-fuchsia-500/10 dark:bg-fuchsia-950/40",
            text: "text-fuchsia-600 dark:text-fuchsia-400",
            border: "border-fuchsia-200 dark:border-fuchsia-800/40",
        };
    }
    return {
        bg: "bg-zinc-500/10 dark:bg-zinc-800/40",
        text: "text-zinc-700 dark:text-zinc-300",
        border: "border-zinc-200 dark:border-zinc-700",
    };
}

export default function AuditLogsPage() {

    // Filter controls
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [selectedResource, setSelectedResource] = useState<string>("ALL");

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);

    // RTK Query hook
    const queryParams = useMemo(() => {
        const p: Record<string, any> = { page, limit };
        if (search.trim()) p.search = search.trim();
        if (selectedResource !== "ALL") p.resource = selectedResource.toLowerCase();
        if (selectedCategory !== "ALL") p.action = selectedCategory;
        return p;
    }, [page, limit, search, selectedResource, selectedCategory]);

    const {
        data,
        isLoading: loading,
        isFetching: refreshing,
        error: queryError,
        refetch,
    } = useGetAuditLogsQuery(queryParams);

    const logs = data?.items || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const totalItems = data?.pagination?.total || logs.length;
    const error = queryError
        ? "message" in queryError
            ? (queryError.message as string)
            : "Failed to load audit logs."
        : null;

    // Inspector Modal
    const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);
    const [copiedJson, setCopiedJson] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyPayloadJson = () => {
        if (!inspectLog) return;
        navigator.clipboard.writeText(JSON.stringify(inspectLog, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    // Category filter pills for administrative and individual operations
    const CATEGORIES = [
        { label: "All Activity", value: "ALL" },
        { label: "Authentication", value: "AUTH_LOGIN_SUCCESS" },
        { label: "Staff & RBAC", value: "STAFF_CREATED" },
        { label: "Products", value: "PRODUCT_CREATED" },
        { label: "Categories", value: "CATEGORY_CREATED" },
        { label: "Single Edits & SEO", value: "SEO_METADATA_UPDATED" },
    ];

    const RESOURCES = [
        { label: "All Resources", value: "ALL" },
        { label: "Auth", value: "auth" },
        { label: "Staff", value: "staff" },
        { label: "Product", value: "product" },
        { label: "Category", value: "category" },
        { label: "SEO (Single Rows)", value: "seo" },
    ];

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
            <div className="space-y-4">
                {/* Page Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                                <ScrollText className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                        Audit Logs & Activity Trail
                                    </h1>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Immutable
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Centralized chronological record of all administrative operations, logins, and individual entity modifications.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={loading || refreshing}
                            className="flex items-center gap-1.5"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            <span>{refreshing ? "Refreshing..." : "Refresh Feed"}</span>
                        </Button>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <Card className="p-3 sm:p-3.5 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-2.5 justify-between">
                        {/* Search Input */}
                        <div className="flex-1 max-w-md">
                            <Input
                                placeholder="Search by actor, action, resource, ID..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                leadingIcon={<Search size={14} />}
                            />
                        </div>

                        {/* Resource Selector Dropdown & Page Size */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    <span>Resource:</span>
                                </div>
                                <div className="w-36">
                                    <Select
                                        value={selectedResource}
                                        onChange={(e) => {
                                            setSelectedResource(e.target.value);
                                            setPage(1);
                                        }}
                                    >
                                        {RESOURCES.map((r) => (
                                            <option key={r.value} value={r.value}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-neutral-400 shrink-0">
                                <span>Show</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="text-xs font-medium rounded-md border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-[#161616] px-2 py-1 text-zinc-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>entries</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Filter Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat.value;
                            return (
                                <button
                                    key={cat.value}
                                    onClick={() => {
                                        setSelectedCategory(cat.value);
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all whitespace-nowrap ${active
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                                        : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Error Banner */}
                {error && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                )}

                {/* Audit Table Card */}
                <Card className="p-0 overflow-hidden flex flex-col border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Spinner size="lg" />
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
                                Loading audit trail...
                            </p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                                <ScrollText className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                No audit records found
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
                                {search || selectedCategory !== "ALL" || selectedResource !== "ALL"
                                    ? "No logs match the current search filters. Try adjusting your criteria."
                                    : "Administrative events will automatically populate here as actions occur in the system."}
                            </p>
                            {(search || selectedCategory !== "ALL" || selectedResource !== "ALL") && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => {
                                        setSearch("");
                                        setSelectedCategory("ALL");
                                        setSelectedResource("ALL");
                                        setPage(1);
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                            <Table className="border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                    <TableRow className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                                        <TableHead className="w-[110px]">Status</TableHead>
                                        <TableHead className="w-[180px]">Timestamp</TableHead>
                                        <TableHead className="w-[220px]">Actor</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Resource</TableHead>
                                        <TableHead className="w-[180px]">Network & IP</TableHead>
                                        <TableHead className="w-[100px] text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const actionStyle = getActionBadgeStyle(log.action);
                                        return (
                                            <TableRow
                                                key={log.id}
                                                className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/60 transition-colors"
                                            >
                                                {/* Status */}
                                                <TableCell>
                                                    {log.status === "SUCCESS" ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Success</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                                            <AlertCircle className="h-3.5 w-3.5" />
                                                            <span>Failed</span>
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Timestamp */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                            {new Date(log.createdAt).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                second: "2-digit",
                                                            })}
                                                        </span>
                                                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatRelativeTime(log.createdAt)}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Actor */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-semibold text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 shrink-0">
                                                            {log.actor?.name
                                                                ? log.actor.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")
                                                                    .slice(0, 2)
                                                                    .toUpperCase()
                                                                : "ST"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                                {log.actor?.name || "Unknown Staff"}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px]">
                                                                    {log.actor?.email}
                                                                </span>
                                                                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase">
                                                                    {log.actor?.role}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Action */}
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                                                    >
                                                        {log.action}
                                                    </span>
                                                </TableCell>

                                                {/* Target Resource */}
                                                <TableCell>
                                                    {log.target ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                                                                {log.target.resource}
                                                            </span>
                                                            {log.target.resourceId && (
                                                                <div className="flex items-center gap-1">
                                                                    <code className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                                                        {log.target.resourceId.length > 12
                                                                            ? `${log.target.resourceId.slice(0, 10)}...`
                                                                            : log.target.resourceId}
                                                                    </code>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleCopy(
                                                                                log.target!.resourceId!,
                                                                                log.id,
                                                                            )
                                                                        }
                                                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                                                        title="Copy Resource ID"
                                                                    >
                                                                        {copiedId === log.id ? (
                                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                                        ) : (
                                                                            <Copy className="h-3 w-3" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-zinc-400">—</span>
                                                    )}
                                                </TableCell>

                                                {/* IP & User Agent */}
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5 text-xs">
                                                        <span className="font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                                            <Globe className="h-3 w-3 text-zinc-400" />
                                                            {log.ipAddress || "127.0.0.1"}
                                                        </span>
                                                        <span
                                                            className="text-[11px] text-zinc-400 truncate max-w-[150px]"
                                                            title={log.userAgent || "Unknown Device"}
                                                        >
                                                            {log.userAgent || "Direct API"}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Details Action */}
                                                <TableCell className="text-right">
                                                    <TableActionGroup>
                                                        <TableAction
                                                            icon={<Eye size={14} />}
                                                            label="Inspect"
                                                            onClick={() => setInspectLog(log)}
                                                            title="Inspect Payload"
                                                        />
                                                    </TableActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pinned Pagination Footer */}
                    {totalItems > 0 && (
                        <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={limit}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </Card>

                {/* Inspect Modal */}
                {inspectLog && (
                    <Modal
                        isOpen={Boolean(inspectLog)}
                        onClose={() => setInspectLog(null)}
                        title={`Audit Event: ${inspectLog.action}`}
                    >
                        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                            {/* Status & Timestamp Header */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                    {inspectLog.status === "SUCCESS" ? (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Execution Succeeded
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                            <AlertCircle className="h-4 w-4" />
                                            Execution Failed: {inspectLog.errorMessage}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">
                                    {new Date(inspectLog.createdAt).toISOString()}
                                </span>
                            </div>

                            {/* Actor Details Card */}
                            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                                    <User className="h-3.5 w-3.5 text-indigo-500" />
                                    <span>Operator Context</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                                    <div>
                                        <span className="text-zinc-400">Name:</span> {inspectLog.actor?.name}
                                    </div>
                                    <div>
                                        <span className="text-zinc-400">Email:</span> {inspectLog.actor?.email}
                                    </div>
                                    <div>
                                        <span className="text-zinc-400">Role:</span>{" "}
                                        <span className="font-mono font-semibold text-indigo-500">
                                            {inspectLog.actor?.role}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-400">Actor ID:</span>{" "}
                                        <span className="font-mono">{inspectLog.actor?.id}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Target Details Card */}
                            {inspectLog.target && (
                                <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                                    <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                                        <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                                        <span>Target Resource</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                                        <div>
                                            <span className="text-zinc-400">Type:</span>{" "}
                                            <span className="font-semibold uppercase">{inspectLog.target.resource}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400">Resource ID:</span>{" "}
                                            <span className="font-mono">{inspectLog.target.resourceId || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Network & Client */}
                            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                                    <Globe className="h-3.5 w-3.5 text-sky-500" />
                                    <span>Client & Network Telemetry</span>
                                </div>
                                <div className="space-y-1 text-zinc-600 dark:text-zinc-300">
                                    <div>
                                        <span className="text-zinc-400">IP Address:</span>{" "}
                                        <span className="font-mono">{inspectLog.ipAddress || "Unknown"}</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-400">User Agent:</span>{" "}
                                        <span className="font-mono break-all">{inspectLog.userAgent || "Unknown"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Structured Payload JSON */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                        <Code2 className="h-3.5 w-3.5 text-amber-500" />
                                        <span>Structured Payload Details</span>
                                    </div>
                                    <button
                                        onClick={handleCopyPayloadJson}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        {copiedJson ? (
                                            <>
                                                <Check className="h-3 w-3 text-emerald-500" />
                                                <span>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span>Copy JSON</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-60 scrollbar-thin">
                                    {JSON.stringify(inspectLog.target?.details || inspectLog, null, 2)}
                                </pre>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button variant="secondary" size="sm" onClick={() => setInspectLog(null)}>
                                    Close Inspector
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </RequireRole>
    );
}
