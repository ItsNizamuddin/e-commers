"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "../../../../lib/api";
import type { Vendor, VendorStatus } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    toast,
} from "@ecommers/ui";
import {
    Users,
    Plus,
    RefreshCw,
    Building2,
    Search,
    Phone,
    Mail,
    FileText,
    DollarSign,
    Calendar,
    ArrowRight,
    CheckCircle2,
    Truck,
    X,
    ShieldCheck,
} from "lucide-react";

export default function VendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | VendorStatus>("ALL");

    // Add Vendor Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContactNumber, setNewContactNumber] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newGstin, setNewGstin] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [newNotes, setNewNotes] = useState("");

    const fetchVendors = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await api.manufacturing.listVendors();
            setVendors(data || []);
        } catch (err: unknown) {
            console.error("Failed to load vendors:", err);
            toast.error("Failed to load vendor directory.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [fetchVendors]);

    const handleCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            toast.error("Vendor Name is required.");
            return;
        }
        if (!newContactNumber.trim()) {
            toast.error("Contact Number / Phone is required.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.manufacturing.createVendor({
                name: newName.trim(),
                contactNumber: newContactNumber.trim(),
                email: newEmail.trim() || undefined,
                gstin: newGstin.trim()?.toUpperCase() || undefined,
                address: newAddress.trim() || undefined,
                notes: newNotes.trim() || undefined,
                status: "ACTIVE",
            });
            toast.success(`Vendor '${newName.trim()}' created successfully!`);
            setIsAddModalOpen(false);
            // Reset form
            setNewName("");
            setNewContactNumber("");
            setNewEmail("");
            setNewGstin("");
            setNewAddress("");
            setNewNotes("");
            fetchVendors();
        } catch (err: any) {
            console.error("Failed to create vendor:", err);
            const msg = err instanceof Error ? err.message : "Failed to create vendor.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filtered Vendors
    const filteredVendors = useMemo(() => {
        return vendors.filter((v) => {
            if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matchName = v.name.toLowerCase().includes(term);
                const matchPhone = v.contactNumber?.toLowerCase().includes(term);
                const matchEmail = v.email?.toLowerCase().includes(term);
                const matchGstin = v.gstin?.toLowerCase().includes(term);
                return matchName || matchPhone || matchEmail || matchGstin;
            }
            return true;
        });
    }, [vendors, statusFilter, searchTerm]);

    // Summary Metrics
    const metrics = useMemo(() => {
        const totalVendors = vendors.length;
        const activeVendors = vendors.filter((v) => v.status === "ACTIVE").length;
        const totalIntakes = vendors.reduce((acc, v) => acc + (v.totalIntakes || 0), 0);
        const totalSpend = vendors.reduce((acc, v) => acc + (v.totalSpend || 0), 0);
        return { totalVendors, activeVendors, totalIntakes, totalSpend };
    }, [vendors]);

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-100 dark:border-emerald-900/60">
                            <Users size={20} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Vendors & Suppliers Master
                        </h1>
                        <Badge variant="success" size="sm">Procurement</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                        Manage external suppliers, contact records, lifetime purchase volumes, and individual intake ledgers.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchVendors(true)}
                        disabled={refreshing}
                        className="gap-2 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin text-emerald-600" : ""} />
                        Refresh
                    </Button>

                    <Link href="/raw-materials/purchases/new">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                            <Truck size={14} />
                            Record Intake
                        </Button>
                    </Link>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsAddModalOpen(true)}
                        className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Plus size={15} />
                        Add Vendor
                    </Button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Total Suppliers</span>
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400">
                            <Building2 size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
                        {metrics.totalVendors}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {metrics.activeVendors} Active Partners
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Active Vendors</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                            <ShieldCheck size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
                        {metrics.activeVendors}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Ready for POs & intakes
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Total Inward Intakes</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                            <Truck size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
                        {metrics.totalIntakes}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Historical supplier lots
                    </p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Lifetime Spend</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                            <DollarSign size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 font-mono">
                        ₹{metrics.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Across all recorded lots
                    </p>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by vendor name, phone, GSTIN..."
                            className="pl-9 text-xs h-9"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <Button
                            variant={statusFilter === "ALL" ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("ALL")}
                            className="text-xs h-8 px-3"
                        >
                            All ({vendors.length})
                        </Button>
                        <Button
                            variant={statusFilter === "ACTIVE" ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("ACTIVE")}
                            className="text-xs h-8 px-3"
                        >
                            Active ({vendors.filter((v) => v.status === "ACTIVE").length})
                        </Button>
                        <Button
                            variant={statusFilter === "INACTIVE" ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("INACTIVE")}
                            className="text-xs h-8 px-3"
                        >
                            Inactive ({vendors.filter((v) => v.status === "INACTIVE").length})
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Vendors Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2">Loading vendors directory...</p>
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="py-20 text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <Building2 size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Vendors Found</h3>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                            {searchTerm
                                ? "No vendors match your search criteria. Try a different search term."
                                : "You have not registered any vendors yet. Add your first vendor to streamline purchase intakes."}
                        </p>
                        {!searchTerm && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsAddModalOpen(true)}
                                className="mt-4 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus size={14} />
                                Add First Vendor
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-neutral-800/80 bg-slate-50/75 dark:bg-neutral-900/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Vendor / Supplier</th>
                                    <th className="py-3 px-4">Contact Info</th>
                                    <th className="py-3 px-4">GSTIN / Tax</th>
                                    <th className="py-3 px-4 text-center">Intakes</th>
                                    <th className="py-3 px-4 text-right">Lifetime Spend</th>
                                    <th className="py-3 px-4">Last Purchase</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Ledger</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-xs">
                                {filteredVendors.map((vendor) => (
                                    <tr
                                        key={vendor.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors group"
                                    >
                                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
                                                    <Building2 size={15} />
                                                </div>
                                                <div>
                                                    <Link
                                                        href={`/raw-materials/vendors/${vendor.id}`}
                                                        className="hover:text-emerald-600 transition-colors"
                                                    >
                                                        {vendor.name}
                                                    </Link>
                                                    {vendor.address && (
                                                        <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                                            {vendor.address}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="space-y-0.5">
                                                {vendor.contactNumber ? (
                                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-neutral-300 font-mono text-[11px]">
                                                        <Phone size={12} className="text-slate-400 shrink-0" />
                                                        <span>{vendor.contactNumber}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">—</span>
                                                )}
                                                {vendor.email && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                                        <Mail size={12} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[160px]">{vendor.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            {vendor.gstin ? (
                                                <span className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-slate-700 dark:text-neutral-300">
                                                    {vendor.gstin}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400">—</span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <Badge variant={vendor.totalIntakes > 0 ? "primary" : "neutral"} size="sm">
                                                {vendor.totalIntakes || 0} lots
                                            </Badge>
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                            ₹{(vendor.totalSpend || 0).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>

                                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                            {vendor.lastPurchaseDate ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span>{new Date(vendor.lastPurchaseDate).toLocaleDateString()}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">No intakes yet</span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <Badge
                                                variant={vendor.status === "ACTIVE" ? "success" : "neutral"}
                                                size="sm"
                                            >
                                                {vendor.status}
                                            </Badge>
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            <Link href={`/raw-materials/vendors/${vendor.id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                >
                                                    View Purchases
                                                    <ArrowRight size={13} />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Vendor Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-white dark:bg-[#151515] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Vendor / Supplier</h3>
                                    <p className="text-[11px] text-slate-500">Only Name & Phone are required to start.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateVendor} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Vendor / Company Name" required>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Royal Spices & Herbs"
                                        required
                                        autoFocus
                                        className="text-xs h-10 font-semibold"
                                    />
                                </FormField>

                                <FormField label="Contact Number / Phone" required>
                                    <Input
                                        value={newContactNumber}
                                        onChange={(e) => setNewContactNumber(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        required
                                        className="text-xs h-10 font-mono"
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Email Address">
                                    <Input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="sales@royalspices.com"
                                        className="text-xs h-10"
                                    />
                                </FormField>

                                <FormField label="GSTIN / Tax ID">
                                    <Input
                                        value={newGstin}
                                        onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
                                        placeholder="29AAAAA0000A1Z5"
                                        className="text-xs h-10 font-mono uppercase"
                                    />
                                </FormField>
                            </div>

                            <FormField label="Registered Office / Warehouse Address">
                                <Input
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="Plot 42, Industrial Area, Bangalore, Karnataka"
                                    className="text-xs h-10"
                                />
                            </FormField>

                            <FormField label="Internal Procurement Notes">
                                <Input
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Payment terms: Net 15 days, delivers via VRL Logistics"
                                    className="text-xs h-10"
                                />
                            </FormField>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmitting || !newName.trim() || !newContactNumber.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                    {isSubmitting ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                    Save Vendor
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
