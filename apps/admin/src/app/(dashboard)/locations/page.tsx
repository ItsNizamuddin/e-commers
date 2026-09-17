"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useGetAdminLocationsQuery,
    useUpdateLocationMutation,
    useDeleteLocationMutation,
    useCheckPincodeMutation,
} from "../../../store/api";
import type { LocationResponse, CheckPincodeResponse } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Select,
    Spinner,
    EmptyState,
    ConfirmDialog,
    ErrorState,
    toast,
    Pagination,
} from "@ecommers/ui";
import {
    MapPin,
    Plus,
    Upload,
    Search,
    Globe,
    CheckCircle2,
    XCircle,
    Edit2,
    Trash2,
    ShieldCheck,
    Navigation,
    RefreshCw,
} from "lucide-react";

export default function LocationsDashboardPage() {
    const router = useRouter();

    const {
        data: locations = [],
        isLoading: loading,
        isFetching: refreshing,
        error: locationsError,
        refetch,
    } = useGetAdminLocationsQuery();

    const [updateLocationMutation] = useUpdateLocationMutation();
    const [deleteLocationMutation] = useDeleteLocationMutation();
    const [checkPincodeMutation, { isLoading: isCheckingPincode }] = useCheckPincodeMutation();

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // Delete confirmation
    const [deletingLocation, setDeletingLocation] = useState<LocationResponse | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pincode lookup testing widget
    const [lookupPincode, setLookupPincode] = useState("");
    const [lookupResult, setLookupResult] = useState<CheckPincodeResponse | null>(null);

    // Filtered data
    const filteredLocations = locations.filter((loc) => {
        const matchesSearch =
            !searchQuery.trim() ||
            loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (loc.stateOrRegion && loc.stateOrRegion.toLowerCase().includes(searchQuery.toLowerCase())) ||
            loc.countryCode.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = typeFilter === "ALL" || loc.type === typeFilter;
        const matchesStatus =
            statusFilter === "ALL" ||
            (statusFilter === "ACTIVE" ? loc.isActive : !loc.isActive);

        return matchesSearch && matchesType && matchesStatus;
    });

    const totalPages = Math.ceil(filteredLocations.length / pageSize) || 1;
    const paginatedLocations = filteredLocations.slice((page - 1) * pageSize, page * pageSize);

    // Quick toggle active
    const handleToggleActive = async (loc: LocationResponse) => {
        try {
            await updateLocationMutation({ id: loc.id, body: { isActive: !loc.isActive } }).unwrap();
            toast.success(`${loc.name} is now ${!loc.isActive ? "Active" : "Disabled"}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to toggle status");
        }
    };

    // Delete handler
    const handleDeleteConfirm = async () => {
        if (!deletingLocation) return;
        setIsDeleting(true);
        try {
            await deleteLocationMutation(deletingLocation.id).unwrap();
            toast.success(`Location ${deletingLocation.name} deleted successfully.`);
            setDeletingLocation(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete location");
        } finally {
            setIsDeleting(false);
        }
    };

    // Check pincode serviceability
    const handleCheckPincode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupPincode.trim()) return;

        setLookupResult(null);
        try {
            const res = await checkPincodeMutation({ pincode: lookupPincode.trim() }).unwrap();
            setLookupResult(res);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Pincode check error");
        }
    };

    const error = locationsError
        ? typeof locationsError === "string"
            ? locationsError
            : "Failed to load serviceable locations."
        : null;

    return (
        <div className="flex flex-col gap-4">
            {/* Header matching Categories */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                        <MapPin size={17} />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                            Serviceable Locations
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                            Manage regional and urban delivery zones, pincode ranges, and multi-location landing parameters.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        isLoading={refreshing}
                        className="gap-1.5 h-8 text-xs font-medium"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/locations/new?tab=bulk")}
                        className="gap-1.5 h-8 text-xs font-medium"
                    >
                        <Upload size={13} />
                        <span>Bulk Ingest (CSV)</span>
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => router.push("/locations/new?tab=single")}
                        className="gap-1.5 h-8 text-xs font-medium"
                    >
                        <Plus size={13} />
                        <span>Add Location</span>
                    </Button>
                </div>
            </div>

            {/* Quick Diagnostic: Pincode Serviceability Lookup Bar */}
            <Card className="p-3.5 bg-slate-50 dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                <form onSubmit={handleCheckPincode} className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                        <ShieldCheck size={16} className="text-blue-500" />
                        <span>Pincode Serviceability Tester:</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                        <Input
                            size="sm"
                            value={lookupPincode}
                            onChange={(e) => setLookupPincode(e.target.value)}
                            placeholder="Enter 6-digit Pincode (e.g. 560001, 500081, 400001)..."
                            className="bg-white dark:bg-black font-mono text-xs"
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            disabled={isCheckingPincode || !lookupPincode.trim()}
                            className="h-8 shrink-0 text-xs gap-1"
                        >
                            {isCheckingPincode ? <RefreshCw size={12} className="animate-spin" /> : <Navigation size={12} />}
                            <span>Test Coverage</span>
                        </Button>
                    </div>

                    {lookupResult && (
                        <div className="animate-in fade-in-50 duration-150 flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs">
                            {lookupResult.serviceable ? (
                                <>
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                        Serviceable in <strong>{lookupResult.location?.name}</strong> ({lookupResult.location?.countryCode})
                                    </span>
                                </>
                            ) : (
                                <>
                                    <XCircle size={14} className="text-amber-500 shrink-0" />
                                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                                        Not serviceable in registered locations
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </form>
            </Card>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
                    />
                    <Input
                        size="sm"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by city, code, or state..."
                        className="pl-8 text-xs"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                        size="sm"
                        value={typeFilter}
                        onChange={(e) => {
                            setTypeFilter(e.target.value);
                            setPage(1);
                        }}
                        className="text-xs"
                        options={[
                            { value: "ALL", label: "All Types" },
                            { value: "CITY", label: "Cities" },
                            { value: "COUNTRY", label: "Countries" },
                            { value: "ZONE", label: "Zones" },
                        ]}
                    />

                    <Select
                        size="sm"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="text-xs"
                        options={[
                            { value: "ALL", label: "All Status" },
                            { value: "ACTIVE", label: "Active Only" },
                            { value: "INACTIVE", label: "Inactive Only" },
                        ]}
                    />
                </div>

                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
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

            {/* Locations Table */}
            {error ? (
                <div className="py-8">
                    <ErrorState
                        title="Failed to load locations"
                        message={error}
                        onRetry={() => refetch()}
                    />
                </div>
            ) : loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Spinner size="md" />
                    <p className="text-xs">Loading serviceable locations...</p>
                </div>
            ) : filteredLocations.length === 0 ? (
                <Card className="p-8 text-center bg-white dark:bg-[#111111] border-slate-200 dark:border-neutral-800">
                    <EmptyState
                        title="No serviceable locations found"
                        description={
                            searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
                                ? "No locations matched your filter parameters."
                                : "Add your first serviceable delivery location or bulk upload via CSV."
                        }
                        action={{
                            label: "Add Location",
                            onClick: () => router.push("/locations/new"),
                        }}
                    />
                </Card>
            ) : (
                <div className="border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-[#111111] flex flex-col shadow-xs">
                    <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px]">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[10px] shadow-xs">
                                <tr>
                                    <th className="py-2.5 px-3.5">Code</th>
                                    <th className="py-2.5 px-3.5">Name & Area</th>
                                    <th className="py-2.5 px-3.5">Type</th>
                                    <th className="py-2.5 px-3.5">Postal Coverage</th>
                                    <th className="py-2.5 px-3.5">Currency</th>
                                    <th className="py-2.5 px-3.5">Status</th>
                                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                                {paginatedLocations.map((loc) => {
                                    const postalCount = loc.postalCodes?.length || 0;
                                    const prefixCount = loc.postalCodePrefixes?.length || 0;

                                    return (
                                        <tr
                                            key={loc.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/50 transition-colors"
                                        >
                                            <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-white">
                                                {loc.code}
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {loc.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                                                    {loc.stateOrRegion ? `${loc.stateOrRegion}, ` : ""}{loc.countryCode}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <Badge
                                                    variant={
                                                        loc.type === "CITY"
                                                            ? "primary"
                                                            : loc.type === "COUNTRY"
                                                                ? "success"
                                                                : "neutral"
                                                    }
                                                    size="sm"
                                                >
                                                    {loc.type}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                {loc.postalCodes?.includes("*") ? (
                                                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                                        Whole Territory (*)
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-neutral-400 font-mono">
                                                        <span>{postalCount.toLocaleString()} codes</span>
                                                        {prefixCount > 0 && (
                                                            <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-500">
                                                                +{prefixCount} prefixes
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                                                {loc.currency || "-"}
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(loc)}
                                                    className="cursor-pointer inline-flex items-center"
                                                    title="Click to toggle active status"
                                                >
                                                    <Badge
                                                        variant={loc.isActive ? "success" : "neutral"}
                                                        size="sm"
                                                    >
                                                        {loc.isActive ? "Active" : "Disabled"}
                                                    </Badge>
                                                </button>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/locations/${loc.id}`)}
                                                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                        title="Edit Location"
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeletingLocation(loc)}
                                                        className="h-7 w-7 p-0 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                                        title="Delete Location"
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredLocations.length > 0 && (
                        <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={filteredLocations.length}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={Boolean(deletingLocation)}
                onClose={() => setDeletingLocation(null)}
                onConfirm={handleDeleteConfirm}
                title={`Delete Location "${deletingLocation?.name}"?`}
                description="Are you sure you want to remove this serviceable location? Products specifically locked to this location may need to be reconfigured."
                confirmLabel={isDeleting ? "Deleting..." : "Delete Location"}
                variant="danger"
            />
        </div>
    );
}
