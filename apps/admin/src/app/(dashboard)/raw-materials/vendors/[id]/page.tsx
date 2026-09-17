"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    useGetVendorByIdQuery,
    useGetVendorPurchasesQuery,
    useUpdateVendorMutation,
} from "../../../../../store/api";
import type { RawMaterialLot, VendorStatus } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    Select,
    Pagination,
    toast,
} from "@ecommers/ui";
import {
    Users,
    ArrowLeft,
    Building2,
    Phone,
    Mail,
    FileText,
    DollarSign,
    Calendar,
    Truck,
    Edit3,
    CheckCircle2,
    Boxes,
    Layers,
    AlertCircle,
    X,
    ExternalLink,
} from "lucide-react";

export default function VendorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params?.id as string;

    const {
        data: vendor,
        isLoading: vendorLoading,
    } = useGetVendorByIdQuery(vendorId, { skip: !vendorId });

    const {
        data: purchases = [],
        isLoading: purchasesLoading,
    } = useGetVendorPurchasesQuery(vendorId, { skip: !vendorId });

    const [updateVendor, { isLoading: isSubmitting }] = useUpdateVendorMutation();
    const loading = vendorLoading || purchasesLoading;

    // Purchases Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalItems = purchases.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedPurchases = useMemo(() => {
        const start = (page - 1) * pageSize;
        return purchases.slice(start, start + pageSize);
    }, [purchases, page, pageSize]);

    // Edit Vendor Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editContact, setEditContact] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editGstin, setEditGstin] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editStatus, setEditStatus] = useState<VendorStatus>("ACTIVE");
    const [editNotes, setEditNotes] = useState("");

    useEffect(() => {
        if (vendor) {
            setEditName(vendor.name || "");
            setEditContact(vendor.contactNumber || "");
            setEditEmail(vendor.email || "");
            setEditGstin(vendor.gstin || "");
            setEditAddress(vendor.address || "");
            setEditStatus(vendor.status || "ACTIVE");
            setEditNotes(vendor.notes || "");
        }
    }, [vendor]);

    const handleUpdateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim()) {
            toast.error("Vendor Name is required.");
            return;
        }

        try {
            await updateVendor({
                id: vendorId,
                body: {
                    name: editName.trim(),
                    contactNumber: editContact.trim() || undefined,
                    email: editEmail.trim() || undefined,
                    gstin: editGstin.trim()?.toUpperCase() || undefined,
                    address: editAddress.trim() || undefined,
                    status: editStatus,
                    notes: editNotes.trim() || undefined,
                },
            }).unwrap();
            toast.success("Vendor profile updated successfully!");
            setIsEditModalOpen(false);
        } catch (err: any) {
            console.error("Failed to update vendor:", err);
            const msg = err?.data?.message || err?.message || "Failed to update vendor.";
            toast.error(msg);
        }
    };

    // Derived statistics from live purchase records
    const purchaseStats = useMemo(() => {
        const totalPurchases = purchases.length;
        const totalSpend = purchases.reduce((acc, p) => {
            const qty = p.initialQuantity || 0;
            const cost = p.costPerUnit || 0;
            return acc + qty * cost;
        }, 0);
        const avgSpend = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
        return { totalPurchases, totalSpend, avgSpend };
    }, [purchases]);

    if (loading) {
        return (
            <div className="py-28 flex flex-col items-center justify-center max-w-4xl mx-auto">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading vendor profile & ledger...</p>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="py-20 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vendor Not Found</h2>
                <p className="text-xs text-slate-500">The requested vendor record does not exist or has been removed.</p>
                <Link href="/raw-materials/vendors">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft size={14} />
                        Back to Vendors Directory
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 max-w-7xl mx-auto">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/raw-materials/vendors"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {vendor.name}
                            </h1>
                            <Badge
                                variant={vendor.status === "ACTIVE" ? "success" : "neutral"}
                                size="sm"
                            >
                                {vendor.status}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                            Vendor Profile & Procurement Purchase History Ledger
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                        className="gap-1.5 text-xs"
                    >
                        <Edit3 size={13} />
                        Edit Profile
                    </Button>

                    <Link href="/raw-materials/purchases/new">
                        <Button
                            variant="primary"
                            size="sm"
                            className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Truck size={14} />
                            Record Inward Intake
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Vendor Profile & KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Vendor Contact & Business Card */}
                <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs md:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800 pb-3">
                        <Building2 size={16} className="text-emerald-600" />
                        <span>Supplier Information</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="text-slate-400 block text-[11px]">Primary Phone / Contact</span>
                            <div className="flex items-center gap-2 font-mono font-medium text-slate-900 dark:text-white">
                                <Phone size={13} className="text-slate-400" />
                                {vendor.contactNumber || "—"}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-slate-400 block text-[11px]">Email Address</span>
                            <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                                <Mail size={13} className="text-slate-400" />
                                {vendor.email || "—"}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-slate-400 block text-[11px]">GSTIN / Tax Identification</span>
                            <div className="flex items-center gap-2 font-mono font-semibold text-slate-900 dark:text-white">
                                <FileText size={13} className="text-slate-400" />
                                {vendor.gstin || "—"}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-slate-400 block text-[11px]">Registered Office Address</span>
                            <p className="text-slate-700 dark:text-neutral-300">
                                {vendor.address || "—"}
                            </p>
                        </div>
                    </div>

                    {vendor.notes && (
                        <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/60">
                            <span className="text-slate-400 block text-[11px] mb-1">Procurement Notes</span>
                            <p className="text-xs text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-slate-100 dark:border-neutral-800">
                                {vendor.notes}
                            </p>
                        </div>
                    )}
                </Card>

                {/* Procurement Volume Summary Card */}
                <Card className="p-5 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800 pb-3">
                        <DollarSign size={16} className="text-emerald-600" />
                        <span>Procurement Summary</span>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 bg-slate-50 dark:bg-neutral-900/60 rounded-xl border border-slate-100 dark:border-neutral-800">
                            <span className="text-[11px] text-slate-400 block">Total Lifetime Spend</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                                ₹{(purchaseStats.totalSpend || vendor.totalSpend || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-slate-50 dark:bg-neutral-900/60 rounded-xl border border-slate-100 dark:border-neutral-800">
                                <span className="text-[11px] text-slate-400 block">Total Intakes</span>
                                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                                    {purchaseStats.totalPurchases || vendor.totalIntakes || 0} lots
                                </span>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-neutral-900/60 rounded-xl border border-slate-100 dark:border-neutral-800">
                                <span className="text-[11px] text-slate-400 block">Avg Intake Value</span>
                                <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                                    ₹{purchaseStats.avgSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Last Purchase Intake:</span>
                            <span className="font-mono text-slate-600 dark:text-neutral-300 font-medium">
                                {vendor.lastPurchaseDate
                                    ? new Date(vendor.lastPurchaseDate).toLocaleDateString()
                                    : "No records"}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Inward Purchases & Lot History Ledger */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Truck size={16} className="text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            Inward Purchase & Lot History Ledger ({purchases.length})
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
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
                            </select>
                            <span>entries</span>
                        </div>
                        <Badge variant="neutral" size="sm">
                            Historical Lots
                        </Badge>
                    </div>
                </div>

                {purchases.length === 0 ? (
                    <div className="py-20 text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <Truck size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Purchase Records Yet</h3>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                            No raw material inward intakes have been recorded from {vendor.name} yet.
                        </p>
                        <Link href="/raw-materials/purchases/new">
                            <Button
                                variant="primary"
                                size="sm"
                                className="mt-4 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Truck size={14} />
                                Record First Intake
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[250px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-4">Lot Number</th>
                                        <th className="py-3 px-4">Raw Material</th>
                                        <th className="py-3 px-4">Intake Date</th>
                                        <th className="py-3 px-4">Expiry Date</th>
                                        <th className="py-3 px-4 text-right">Quantity</th>
                                        <th className="py-3 px-4 text-right">Unit Rate</th>
                                        <th className="py-3 px-4 text-right">Total Cost</th>
                                        <th className="py-3 px-4">Invoice / PO</th>
                                        <th className="py-3 px-4 text-center">Stock Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-xs">
                                    {paginatedPurchases.map((lot) => {
                                    const rm = typeof lot.rawMaterialId === "object" ? (lot.rawMaterialId as any) : null;
                                    const totalLotCost = (lot.initialQuantity || 0) * (lot.costPerUnit || 0);

                                    return (
                                        <tr
                                            key={lot.id}
                                            className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                                        >
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px]">
                                                        {lot.lotNumber}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                                                        <Boxes size={14} />
                                                    </div>
                                                    <div>
                                                        <span>{rm?.name || "Raw Material"}</span>
                                                        <span className="block text-[11px] font-mono text-slate-400 font-normal">
                                                            {rm?.code || "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-neutral-300">
                                                {lot.receivedDate
                                                    ? new Date(lot.receivedDate).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-[11px]">
                                                {lot.expiryDate ? (
                                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                                        {new Date(lot.expiryDate).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                {lot.initialQuantity} {lot.unit}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-neutral-300">
                                                ₹{(lot.costPerUnit || 0).toFixed(2)} / {lot.unit}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                ₹{totalLotCost.toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-neutral-300">
                                                {lot.supplier?.invoiceNumber || "—"}
                                            </td>

                                            <td className="py-3.5 px-4 text-center">
                                                {lot.isDepleted ? (
                                                    <Badge variant="neutral" size="sm">
                                                        Depleted
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="success" size="sm">
                                                        {lot.availableQuantity} {lot.unit} Left
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalItems > 0 && (
                        <div className="p-3 sm:px-4 border-t border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-900/30 shrink-0">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </>
            )}
        </Card>

            {/* Edit Vendor Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-white dark:bg-[#151515] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Vendor Profile</h3>
                                    <p className="text-[11px] text-slate-500">Update supplier details and status.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateVendor} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Vendor / Company Name" required>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                        className="text-xs h-10 font-semibold"
                                    />
                                </FormField>

                                <FormField label="Contact Number / Phone">
                                    <Input
                                        value={editContact}
                                        onChange={(e) => setEditContact(e.target.value)}
                                        className="text-xs h-10 font-mono"
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Email Address">
                                    <Input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="text-xs h-10"
                                    />
                                </FormField>

                                <FormField label="GSTIN / Tax ID">
                                    <Input
                                        value={editGstin}
                                        onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                                        className="text-xs h-10 font-mono uppercase"
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Vendor Status" required>
                                    <Select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value as VendorStatus)}
                                        className="text-xs h-10"
                                    >
                                        <option value="ACTIVE">ACTIVE (Active Supplier)</option>
                                        <option value="INACTIVE">INACTIVE (Dormant/Suspended)</option>
                                    </Select>
                                </FormField>

                                <FormField label="Office / Warehouse Address">
                                    <Input
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        className="text-xs h-10"
                                    />
                                </FormField>
                            </div>

                            <FormField label="Internal Procurement Notes">
                                <Input
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="text-xs h-10"
                                />
                            </FormField>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isSubmitting || !editName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                    {isSubmitting ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                    Update Profile
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
