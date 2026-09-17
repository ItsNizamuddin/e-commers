"use client";

import React, { useState, useMemo } from "react";
import { getAccessToken } from "../../../lib/api";
import { useGetJobsListQuery } from "../../../store/api";
import type { QueueJobItem, QueueJobStatus } from "@ecommers/types";
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
    Pagination,
} from "@ecommers/ui";
import {
    Cpu,
    RefreshCw,
    Search,
    Code2,
    Copy,
    Check,
    Eye,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Layers,
    Terminal,
    User,
    ExternalLink,
    Filter,
    Activity,
} from "lucide-react";
import { RequireRole } from "../../../components/auth/require-role";

function formatRelativeTime(dateString?: string | Date): string {
    if (!dateString) return "—";
    const now = new Date();
    const date = new Date(dateString);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getStatusBadge(status: QueueJobStatus) {
    switch (status) {
        case "COMPLETED":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    COMPLETED
                </span>
            );
        case "PROCESSING":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    PROCESSING
                </span>
            );
        case "PENDING":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    PENDING
                </span>
            );
        case "FAILED":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    FAILED
                </span>
            );
        default:
            return <Badge variant="neutral">{status}</Badge>;
    }
}

function getQueueBadgeColor(queue: string): string {
    switch (queue) {
        case "documents":
            return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40";
        case "notifications":
            return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40";
        case "bulkProcessing":
            return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
        case "maintenance":
            return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40";
        default:
            return "bg-slate-500/10 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800";
    }
}

const BULK_OPERATIONS = [
    { value: "ALL_BULK", label: "All Bulk Operations" },
    { value: "bulk-seo-import", label: "Bulk SEO Imports" },
    { value: "bulk-seo-autofill", label: "Bulk SEO Auto-Fills" },
    { value: "bulk-catalog-sync", label: "Bulk Catalog & Stock Updaters" },
];

const STATUSES: Array<{ value: string; label: string }> = [
    { value: "", label: "All Statuses" },
    { value: "COMPLETED", label: "Completed" },
    { value: "PROCESSING", label: "Processing" },
    { value: "PENDING", label: "Pending" },
    { value: "FAILED", label: "Failed" },
];

export default function BackgroundJobsPage() {
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Filters & Pagination - Strictly focused on Bulk Operations & Updaters
    const [selectedOperation, setSelectedOperation] = useState("ALL_BULK");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Modal Inspection
    const [inspectJob, setInspectJob] = useState<QueueJobItem | null>(null);
    const [copiedPayload, setCopiedPayload] = useState(false);
    const [copiedResult, setCopiedResult] = useState(false);

    const isSpecificJob = selectedOperation.startsWith("bulk-");
    const { data, isLoading: loading, isFetching: isRefreshing, refetch } = useGetJobsListQuery(
        {
            queueName: isSpecificJob ? undefined : "bulkProcessing",
            jobName: isSpecificJob ? selectedOperation : undefined,
            status: selectedStatus || undefined,
            referenceNumber: searchQuery.trim() || undefined,
            page,
            limit: pageSize,
        },
        {
            pollingInterval: autoRefresh ? 6000 : 0,
        }
    );

    const jobs = data?.items || [];
    const totalPages = data?.pagination?.totalPages || 1;
    const totalCount = data?.pagination?.total || 0;

    // Summary stats
    const stats = useMemo(() => {
        const completed = jobs.filter((j) => j.status === "COMPLETED").length;
        const processing = jobs.filter((j) => j.status === "PROCESSING").length;
        const failed = jobs.filter((j) => j.status === "FAILED").length;
        const pending = jobs.filter((j) => j.status === "PENDING").length;
        return { completed, processing, failed, pending };
    }, [jobs]);

    const handleCopyJson = (payloadData: any, type: "payload" | "result") => {
        if (!payloadData) return;
        navigator.clipboard.writeText(JSON.stringify(payloadData, null, 2));
        if (type === "payload") {
            setCopiedPayload(true);
            setTimeout(() => setCopiedPayload(false), 2000);
        } else {
            setCopiedResult(true);
            setTimeout(() => setCopiedResult(false), 2000);
        }
    };

    const handleOpenBullBoard = () => {
        const token = getAccessToken();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
        const targetUrl = token
            ? `${baseUrl}/admin/queues?token=${encodeURIComponent(token)}`
            : `${baseUrl}/admin/queues`;
        window.open(targetUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <RequireRole allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                <Cpu size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    Bulk Operations & Updaters Queue
                                    <Badge variant="primary" size="sm">Bulk Processing Engine</Badge>
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">
                                    Track high-volume bulk updaters, CSV imports, batch autofills, and bulk catalog reconciliations.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Bull Board UI Launch */}
                        <button
                            type="button"
                            onClick={handleOpenBullBoard}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 transition-colors"
                            title="Open Bull Board Dashboard (Redis Queue Visualizer)"
                        >
                            <Activity size={14} />
                            <span>Bull Board UI</span>
                            <ExternalLink size={12} className="opacity-70" />
                        </button>

                        {/* Auto-Refresh Toggle */}
                        <button
                            type="button"
                            onClick={() => setAutoRefresh((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                                autoRefresh
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                            <span>Auto-refresh {autoRefresh ? "ON" : "OFF"}</span>
                        </button>

                        {/* Manual Refresh Button */}
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={loading || isRefreshing}
                            className="gap-1.5"
                        >
                            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-blue-600" : ""} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* Metric Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Bulk Jobs</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Across bulk queues</div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl">
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Completed (Page)
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Successful checkpoints</div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl">
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            <Activity size={12} />
                            Active / In-Flight
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.processing + stats.pending}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{stats.processing} processing, {stats.pending} pending</div>
                    </Card>

                    <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl">
                        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle size={12} />
                            Failed (Page)
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.failed}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Crash-safe retries available</div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Filter size={14} className="text-blue-600" />
                        <span>Filter Bulk Operations & Updaters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by Reference # (e.g. SEO-IMP...)"
                                className="pl-9 text-xs h-9"
                            />
                        </div>

                        <Select
                            value={selectedOperation}
                            onChange={(e) => {
                                setSelectedOperation(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs h-9 font-medium"
                        >
                            {BULK_OPERATIONS.map((op) => (
                                <option key={op.value} value={op.value}>
                                    {op.label}
                                </option>
                            ))}
                        </Select>

                        <Select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs h-9 font-semibold"
                        >
                            {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </Card>

                {/* Jobs Table */}
                <Card className="p-0 overflow-hidden bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl flex flex-col shadow-xs">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-blue-600" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Tracked Bulk Updaters & Ledger</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
                            <span>Show</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
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
                    </div>

                    {loading && jobs.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Spinner size="lg" />
                            <p className="text-xs text-slate-400">Querying bulk operation ledger...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <Layers size={32} className="mx-auto text-slate-300 dark:text-neutral-700" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Bulk Operations Found</h3>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
                                No bulk operations or updaters matching your filter criteria were found in the queue tracking table.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                            <Table className="border-none rounded-none">
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs shadow-xs">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Bulk Job / ID</TableHead>
                                        <TableHead>Operation Queue</TableHead>
                                        <TableHead>Reference Number</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Trigger Source</TableHead>
                                        <TableHead>Duration / Attempts</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jobs.map((job) => {
                                        const queueColor = getQueueBadgeColor(job.queueName);
                                        return (
                                            <TableRow key={job.jobId} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <Terminal size={12} className="text-slate-400 shrink-0" />
                                                            <span>{job.jobName}</span>
                                                        </div>
                                                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[170px]" title={job.jobId}>
                                                            {job.jobId}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${queueColor}`}>
                                                        {job.queueName}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    {job.audit?.referenceNumber ? (
                                                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/50">
                                                            {job.audit.referenceNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-mono">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>{getStatusBadge(job.status)}</TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-neutral-300">
                                                        <User size={12} className="text-slate-400" />
                                                        <span>{job.audit?.triggeredBy?.source || "SYSTEM"}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-xs">
                                                        <span className="font-semibold text-slate-800 dark:text-neutral-200">
                                                            {job.durationMs !== undefined ? `${job.durationMs}ms` : "—"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 ml-1.5">
                                                            (Try {job.attempts || 1}/{job.maxAttempts || 3})
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-xs text-slate-600 dark:text-neutral-400">
                                                        <div className="font-medium">{formatRelativeTime(job.createdAt)}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setInspectJob(job)}
                                                        className="text-xs gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                                                    >
                                                        <Eye size={13} />
                                                        <span>Inspect</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pinned Pagination Footer */}
                    {totalCount > 0 && (
                        <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalCount}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </Card>

                {/* Job Inspection Modal */}
                {inspectJob && (
                    <Modal
                        isOpen={Boolean(inspectJob)}
                        onClose={() => setInspectJob(null)}
                        title={`Job Inspection: ${inspectJob.jobName}`}
                        description={`Job ID: ${inspectJob.jobId}`}
                        maxWidth="xl"
                    >
                        <div className="space-y-5 text-xs">
                            {/* Metadata Pills */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Queue</div>
                                    <div className="font-mono font-semibold text-slate-800 dark:text-white mt-0.5">{inspectJob.queueName}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                                    <div className="mt-0.5">{getStatusBadge(inspectJob.status)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
                                    <div className="font-semibold text-slate-800 dark:text-white mt-0.5">{inspectJob.durationMs !== undefined ? `${inspectJob.durationMs}ms` : "—"}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Attempts</div>
                                    <div className="font-semibold text-slate-800 dark:text-white mt-0.5">{inspectJob.attempts} / {inspectJob.maxAttempts}</div>
                                </div>
                            </div>

                            {/* Reference & Audit Info */}
                            {inspectJob.audit && (
                                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-neutral-800 space-y-2">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <User size={13} className="text-blue-600" />
                                        <span>Audit & Trigger Context</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                        <div>
                                            <span className="text-slate-400">Reference Number: </span>
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{inspectJob.audit.referenceNumber || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Aggregate Type: </span>
                                            <span className="font-semibold">{inspectJob.audit.aggregateType || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Source: </span>
                                            <span className="font-semibold">{inspectJob.audit.triggeredBy?.source || "SYSTEM"}</span>
                                        </div>
                                        {inspectJob.audit.correlationId && (
                                            <div className="col-span-2">
                                                <span className="text-slate-400">Correlation ID: </span>
                                                <span className="font-mono text-[10px]">{inspectJob.audit.correlationId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Transition Audit Timeline */}
                            {inspectJob.auditHistory && inspectJob.auditHistory.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Clock size={13} className="text-purple-600" />
                                        <span>State Transition History</span>
                                    </div>
                                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800">
                                        {inspectJob.auditHistory.map((h, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] border-b border-slate-100 dark:border-neutral-800/60 pb-1 last:border-none last:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">{h.action}</span>
                                                    {h.notes && <span className="text-slate-500 dark:text-neutral-400">({h.notes})</span>}
                                                </div>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                    {new Date(h.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payload JSON */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Code2 size={13} className="text-blue-600" />
                                        Input Payload
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyJson(inspectJob.payload, "payload")}
                                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        {copiedPayload ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        <span>{copiedPayload ? "Copied" : "Copy Payload"}</span>
                                    </button>
                                </div>
                                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono max-h-40">
                                    {JSON.stringify(inspectJob.payload, null, 2)}
                                </pre>
                            </div>

                            {/* Result Artifacts or Error */}
                            {inspectJob.result && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                            <CheckCircle2 size={13} />
                                            Execution Result Artifacts
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyJson(inspectJob.result, "result")}
                                            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            {copiedResult ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                            <span>{copiedResult ? "Copied" : "Copy Result"}</span>
                                        </button>
                                    </div>
                                    <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl overflow-x-auto text-[11px] font-mono max-h-40">
                                        {JSON.stringify(inspectJob.result, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {inspectJob.error && (
                                <div className="space-y-1.5">
                                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                        <AlertCircle size={13} />
                                        Failure Details & Stack Trace
                                    </span>
                                    <pre className="p-3 bg-rose-950/40 text-rose-300 border border-rose-900/50 rounded-xl overflow-x-auto text-[11px] font-mono max-h-40">
                                        {inspectJob.error.message}
                                        {inspectJob.error.stack && `\n\n${inspectJob.error.stack}`}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </div>
        </RequireRole>
    );
}
