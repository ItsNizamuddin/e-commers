"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../../lib/api";
import type {
    RawMaterial,
    RawMaterialUnit,
    RawMaterialSourceType,
    Vendor,
} from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    FormField,
    Select,
    toast,
} from "@ecommers/ui";
import {
    Truck,
    ArrowLeft,
    Building2,
    Tractor,
    Calendar,
    Scale,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    DollarSign,
    Users,
    Plus,
    X,
} from "lucide-react";

const UNITS: Array<{ label: string; value: RawMaterialUnit }> = [
    { label: "Kilograms (kg)", value: "kg" },
    { label: "Grams (g)", value: "g" },
    { label: "Liters (l)", value: "l" },
    { label: "Milliliters (ml)", value: "ml" },
    { label: "Pieces (pcs)", value: "pcs" },
    { label: "Packs (pack)", value: "pack" },
];

export default function NewRawMaterialPurchasePage() {
    const router = useRouter();

    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [selectedMaterialId, setSelectedMaterialId] = useState("");
    const [sourceType, setSourceType] = useState<RawMaterialSourceType>("EXTERNAL_VENDOR");

    // External Vendor & Vendor Master
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [vendorContact, setVendorContact] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");

    // Quick New Vendor modal
    const [showQuickVendorModal, setShowQuickVendorModal] = useState(false);
    const [quickVendorName, setQuickVendorName] = useState("");
    const [quickVendorContact, setQuickVendorContact] = useState("");
    const [isCreatingVendor, setIsCreatingVendor] = useState(false);

    // Own Farm
    const [farmName, setFarmName] = useState("Mandya Farm - Plot 1");
    const [plotId, setPlotId] = useState("Plot A");
    const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [harvestLotNumber, setHarvestLotNumber] = useState("");
    const [valuationMethod, setValuationMethod] = useState<"OPERATIONAL_COST" | "MARKET_RATE" | "ZERO_COST">("OPERATIONAL_COST");

    // Quantity & Cost
    const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState<RawMaterialUnit>("kg");
    const [totalCost, setTotalCost] = useState("");
    const [lotNumber, setLotNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        return d.toISOString().slice(0, 10);
    });
    const [notes, setNotes] = useState("");

    const fetchVendors = () => {
        setLoadingVendors(true);
        api.manufacturing
            .listVendors({ status: "ACTIVE" })
            .then((data) => setVendors(data || []))
            .catch((err) => console.error("Failed to load vendors:", err))
            .finally(() => setLoadingVendors(false));
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    useEffect(() => {
        setLoadingMaterials(true);
        api.manufacturing
            .listRawMaterials({ isActive: true })
            .then((data) => {
                setMaterials(data || []);
                if (data && data.length > 0) {
                    const firstId = data[0]!.id || (data[0]! as any)._id || "";
                    setSelectedMaterialId(firstId);
                    setUnit(data[0]!.unit);
                }
            })
            .catch((err) => {
                console.error("Failed to load materials:", err);
                toast.error("Failed to load raw materials list.");
            })
            .finally(() => setLoadingMaterials(false));
    }, []);

    const selectedMaterial = useMemo(() => {
        return materials.find((m) => (m.id || (m as any)._id) === selectedMaterialId);
    }, [materials, selectedMaterialId]);

    const selectedVendor = useMemo(() => {
        return vendors.find((v) => v.id === selectedVendorId);
    }, [vendors, selectedVendorId]);

    const handleSelectVendor = (vendorId: string) => {
        setSelectedVendorId(vendorId);
        if (!vendorId) {
            return;
        }
        const v = vendors.find((vend) => vend.id === vendorId);
        if (v) {
            setVendorName(v.name);
            setVendorContact(v.contactNumber || "");
        }
    };

    const handleQuickCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickVendorName.trim()) {
            toast.error("Vendor Name is required.");
            return;
        }
        if (!quickVendorContact.trim()) {
            toast.error("Vendor Contact / Phone is required.");
            return;
        }

        setIsCreatingVendor(true);
        try {
            const created = await api.manufacturing.createVendor({
                name: quickVendorName.trim(),
                contactNumber: quickVendorContact.trim(),
            });
            toast.success(`Vendor '${created.name}' created!`);
            setVendors((prev) => [created, ...prev]);
            setSelectedVendorId(created.id);
            setVendorName(created.name);
            setVendorContact(created.contactNumber || "");
            setShowQuickVendorModal(false);
            setQuickVendorName("");
            setQuickVendorContact("");
        } catch (err: any) {
            console.error("Failed to create vendor:", err);
            const msg = err instanceof Error ? err.message : "Failed to create vendor.";
            toast.error(msg);
        } finally {
            setIsCreatingVendor(false);
        }
    };

    const handleMaterialChange = (matId: string) => {
        setSelectedMaterialId(matId);
        const mat = materials.find((m) => (m.id || (m as any)._id) === matId);
        if (mat) {
            setUnit(mat.unit);
        }
    };

    // Live WAC Simulator
    const wacSimulation = useMemo(() => {
        if (!selectedMaterial) return null;

        const currentStock = selectedMaterial.currentStock || 0;
        const currentAvg = selectedMaterial.averageCost || 0;
        const incomingQty = parseFloat(quantity) || 0;
        const incomingTotalCost = parseFloat(totalCost) || 0;

        if (incomingQty <= 0) {
            return {
                currentStock,
                currentAvg,
                incomingQty: 0,
                incomingRate: 0,
                newStock: currentStock,
                newWac: currentAvg,
                wacDelta: 0,
            };
        }

        const incomingRate = incomingTotalCost / incomingQty;
        const currentValuation = currentStock * currentAvg;
        const totalNewValuation = currentValuation + incomingTotalCost;
        const newStock = currentStock + incomingQty;
        const newWac = newStock > 0 ? totalNewValuation / newStock : 0;
        const wacDelta = newWac - currentAvg;

        return {
            currentStock,
            currentAvg,
            incomingQty,
            incomingRate,
            newStock,
            newWac,
            wacDelta,
        };
    }, [selectedMaterial, quantity, totalCost]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMaterialId) {
            toast.error("Please select a raw material.");
            return;
        }

        const qtyNum = parseFloat(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            toast.error("Please enter a valid positive intake quantity.");
            return;
        }

        if (sourceType === "EXTERNAL_VENDOR" && !vendorName.trim()) {
            toast.error("Supplier/Vendor name is required.");
            return;
        }

        if (sourceType === "OWN_FARM" && !farmName.trim()) {
            toast.error("Farm name is required.");
            return;
        }

        const totalCostNum = totalCost ? parseFloat(totalCost) : 0;

        setIsSaving(true);
        try {
            await api.manufacturing.recordPurchase({
                rawMaterialId: selectedMaterialId,
                sourceType,
                vendorId: sourceType === "EXTERNAL_VENDOR" && selectedVendorId ? selectedVendorId : undefined,
                supplier:
                    sourceType === "EXTERNAL_VENDOR"
                        ? {
                              name: vendorName.trim(),
                              contact: vendorContact.trim() || undefined,
                              invoiceNumber: invoiceNumber.trim() || undefined,
                          }
                        : undefined,
                farmDetails:
                    sourceType === "OWN_FARM"
                        ? {
                              farmName: farmName.trim(),
                              plotId: plotId.trim() || undefined,
                              harvestDate: new Date(harvestDate).toISOString(),
                              harvestLotNumber: harvestLotNumber.trim() || undefined,
                              valuationMethod,
                          }
                        : undefined,
                purchaseDate: new Date(purchaseDate).toISOString(),
                quantity: qtyNum,
                unit,
                totalCost: totalCostNum,
                lotNumber: lotNumber.trim() || undefined,
                expiryDate: new Date(expiryDate).toISOString(),
                notes: notes.trim() || undefined,
            });

            toast.success("Inward purchase/harvest lot recorded successfully!");
            router.push("/raw-materials/purchases");
        } catch (err: unknown) {
            console.error("Failed to record intake:", err);
            const msg = err instanceof Error ? err.message : "Failed to record intake.";
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingMaterials) {
        return (
            <div className="flex flex-col items-center justify-center py-28 max-w-4xl mx-auto">
                <Spinner size="lg" />
                <p className="text-xs text-slate-400 mt-2 font-medium">Loading catalog...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header & Breadcrumb */}
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/raw-materials/purchases"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Record Inward Raw Material Intake
                            </h1>
                            <Badge variant="success" size="sm">Procurement</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">
                            Log supplier shipments or farm harvests, assign lot numbers, and simulate weighted cost impact.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Source Origin: External Vendor vs Own Farm Harvest */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Building2 size={16} className="text-emerald-600" />
                        <span>1. Intake Source & Origin</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div
                            onClick={() => setSourceType("EXTERNAL_VENDOR")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                sourceType === "EXTERNAL_VENDOR"
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500 shadow-xs"
                                    : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center">
                                    <Building2 size={16} />
                                </div>
                                {sourceType === "EXTERNAL_VENDOR" && <CheckCircle2 size={16} className="text-emerald-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">External Supplier / Vendor</h4>
                            <p className="text-[11px] text-slate-500 mt-1">Purchased from commercial distributors or ingredient suppliers.</p>
                        </div>

                        <div
                            onClick={() => setSourceType("OWN_FARM")}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                sourceType === "OWN_FARM"
                                    ? "bg-amber-50/60 dark:bg-amber-950/40 border-amber-600 dark:border-amber-500 shadow-xs"
                                    : "bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center">
                                    <Tractor size={16} />
                                </div>
                                {sourceType === "OWN_FARM" && <CheckCircle2 size={16} className="text-amber-600" />}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Own Farm Harvest</h4>
                            <p className="text-[11px] text-slate-500 mt-1">Harvested directly from company agricultural plots.</p>
                        </div>
                    </div>

                    {/* Source Specific Fields */}
                    {sourceType === "EXTERNAL_VENDOR" ? (
                        <div className="space-y-4 pt-2">
                            {/* Vendor Selector & Quick Add */}
                            <div className="p-3.5 bg-slate-50 dark:bg-neutral-900/80 rounded-xl border border-slate-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="flex-1">
                                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                                        Select Saved Vendor / Supplier
                                    </label>
                                    <Select
                                        value={selectedVendorId}
                                        onChange={(e) => handleSelectVendor(e.target.value)}
                                        className="text-xs h-9 font-medium"
                                    >
                                        <option value="">-- Choose Existing Vendor (or enter details below) --</option>
                                        {vendors.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} {v.contactNumber ? `(${v.contactNumber})` : ""} — {v.totalIntakes || 0} intakes recorded
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowQuickVendorModal(true)}
                                        className="gap-1.5 text-xs h-9 border-dashed border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap"
                                    >
                                        <Plus size={14} />
                                        Quick Add Vendor
                                    </Button>
                                </div>
                            </div>

                            {selectedVendor && (
                                <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-emerald-600" />
                                        <span>Linked to Master Vendor: <strong>{selectedVendor.name}</strong></span>
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                            ({selectedVendor.totalIntakes || 0} intakes • ₹{(selectedVendor.totalSpend || 0).toLocaleString()} lifetime spend)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedVendorId("");
                                            setVendorName("");
                                            setVendorContact("");
                                        }}
                                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                                    >
                                        Clear link
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField label="Vendor / Supplier Name" required>
                                    <Input
                                        value={vendorName}
                                        onChange={(e) => {
                                            setVendorName(e.target.value);
                                            if (selectedVendorId && e.target.value !== selectedVendor?.name) {
                                                setSelectedVendorId("");
                                            }
                                        }}
                                        placeholder="e.g. Royal Ghee Distributors"
                                        required
                                        className="text-xs h-10 font-semibold"
                                    />
                                </FormField>

                                <FormField label="Supplier Invoice / PO #">
                                    <Input
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        placeholder="INV-2026-901"
                                        className="font-mono text-xs h-10"
                                    />
                                </FormField>

                                <FormField label="Supplier Contact / Phone">
                                    <Input
                                        value={vendorContact}
                                        onChange={(e) => setVendorContact(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className="text-xs h-10"
                                    />
                                </FormField>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                            <FormField label="Farm / Facility Name" required>
                                <Input
                                    value={farmName}
                                    onChange={(e) => setFarmName(e.target.value)}
                                    placeholder="Mandya Organic Farm"
                                    required
                                    className="text-xs h-10 font-semibold"
                                />
                            </FormField>

                            <FormField label="Plot / Sector ID">
                                <Input
                                    value={plotId}
                                    onChange={(e) => setPlotId(e.target.value)}
                                    placeholder="Plot B-North"
                                    className="text-xs h-10"
                                />
                            </FormField>

                            <FormField label="Harvest Date" required>
                                <Input
                                    type="date"
                                    value={harvestDate}
                                    onChange={(e) => setHarvestDate(e.target.value)}
                                    required
                                    className="text-xs h-10 font-mono"
                                />
                            </FormField>

                            <FormField label="Cost Valuation Method" required>
                                <Select
                                    value={valuationMethod}
                                    onChange={(e) => setValuationMethod(e.target.value as any)}
                                    className="text-xs h-10"
                                >
                                    <option key="OPERATIONAL_COST" value="OPERATIONAL_COST">Operational Labor/Fuel Cost</option>
                                    <option key="MARKET_RATE" value="MARKET_RATE">Wholesale Mandi Market Rate</option>
                                    <option key="ZERO_COST" value="ZERO_COST">Zero Cost (Sunk/Free)</option>
                                </Select>
                            </FormField>
                        </div>
                    )}
                </Card>

                {/* 2. Item & Lot Specification */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <Scale size={16} className="text-blue-600" />
                        <span>2. Material Selection & Lot Attributes</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Raw Material" required helperText="Select the item receiving this stock">
                            <Select
                                value={selectedMaterialId}
                                onChange={(e) => handleMaterialChange(e.target.value)}
                                required
                                className="text-xs h-10 font-semibold"
                            >
                                {materials.map((m, idx) => {
                                    const mKey = m.id || (m as any)._id || m.code || `rm-${idx}`;
                                    const mVal = m.id || (m as any)._id || m.code;
                                    return (
                                        <option key={mKey} value={mVal}>
                                            {m.name} ({m.code}) — Current: {m.currentStock} {m.unit}
                                        </option>
                                    );
                                })}
                            </Select>
                        </FormField>

                        <FormField label="Batch / Lot Number" helperText="Supplier lot or harvest lot (blank for auto-generated)">
                            <Input
                                value={lotNumber}
                                onChange={(e) => setLotNumber(e.target.value.toUpperCase())}
                                placeholder="e.g. LOT-2026-0901"
                                className="font-mono text-xs h-10 uppercase"
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Intake Date" required>
                            <Input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                required
                                className="text-xs h-10 font-mono"
                            />
                        </FormField>

                        <FormField label="Expiry / Best Before Date" required helperText="Critical for FEFO production batch allocation">
                            <Input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                required
                                className="text-xs h-10 font-mono font-bold text-amber-600"
                            />
                        </FormField>
                    </div>
                </Card>

                {/* 3. Quantity & Cost Accounting + Live WAC Simulator */}
                <Card className="p-6 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs space-y-5">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm border-b border-slate-100 dark:border-neutral-800/60 pb-3">
                        <DollarSign size={16} className="text-emerald-600" />
                        <span>3. Quantity, Cost Accounting & Live WAC Simulator</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField label={`Intake Quantity (${unit})`} required>
                            <Input
                                type="number"
                                step="any"
                                min="0.001"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="e.g. 50"
                                required
                                className="font-mono text-xs h-10 font-bold"
                            />
                        </FormField>

                        <FormField label="Total Cost Paid / Valued (₹)" required helperText="Total invoice amount or farm valuation">
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                value={totalCost}
                                onChange={(e) => setTotalCost(e.target.value)}
                                placeholder="e.g. 5000"
                                required
                                className="font-mono text-xs h-10 font-bold text-emerald-600"
                            />
                        </FormField>

                        <FormField label={`Effective Rate (₹ / ${unit})`}>
                            <Input
                                value={
                                    quantity && totalCost && parseFloat(quantity) > 0
                                        ? `₹${(parseFloat(totalCost) / parseFloat(quantity)).toFixed(2)} / ${unit}`
                                        : "—"
                                }
                                disabled
                                className="font-mono text-xs h-10 bg-slate-100 dark:bg-neutral-800 cursor-not-allowed font-semibold text-slate-700 dark:text-neutral-300"
                            />
                        </FormField>
                    </div>

                    {/* Interactive WAC Simulation Breakdown */}
                    {wacSimulation && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-neutral-800 pb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                                    <TrendingUp size={14} className="text-blue-600" />
                                    <span>Real-Time WAC (Weighted Average Cost) Impact</span>
                                </div>
                                <span className="text-[11px] text-slate-400">Formula: (Old Valuation + New Cost) / Total New Stock</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Current WAC</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-neutral-300">
                                        ₹{wacSimulation.currentAvg.toFixed(2)} / {unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Incoming Batch Rate</span>
                                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                        ₹{wacSimulation.incomingRate.toFixed(2)} / {unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">New Total Stock</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {wacSimulation.newStock} {unit}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Resulting New WAC</span>
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                        ₹{wacSimulation.newWac.toFixed(2)} / {unit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <FormField label="Intake Notes & Inspector Remarks">
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Moisture level checked: 11.2%, passed QA inspection."
                            className="text-xs h-10"
                        />
                    </FormField>
                </Card>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Link href="/raw-materials/purchases">
                        <Button variant="outline" type="button" size="md">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        variant="primary"
                        type="submit"
                        size="md"
                        disabled={isSaving}
                        className="gap-2 px-6 font-semibold"
                    >
                        {isSaving ? "Saving..." : "Record Inward Intake"}
                    </Button>
                </div>
            </form>

            {/* Quick Create Vendor Modal */}
            {showQuickVendorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white dark:bg-[#151515] border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600">
                                    <Building2 size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Add Vendor</h3>
                                    <p className="text-[11px] text-slate-500">Create vendor with Name and Phone number only.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQuickVendorModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleQuickCreateVendor} className="p-5 space-y-4">
                            <FormField label="Vendor / Supplier Name" required>
                                <Input
                                    value={quickVendorName}
                                    onChange={(e) => setQuickVendorName(e.target.value)}
                                    placeholder="e.g. Royal Spices & Herbs"
                                    required
                                    autoFocus
                                    className="text-xs h-10 font-semibold"
                                />
                            </FormField>

                            <FormField label="Contact Number / Phone" required helperText="Minimum required to identify and contact supplier">
                                <Input
                                    value={quickVendorContact}
                                    onChange={(e) => setQuickVendorContact(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    required
                                    className="text-xs h-10 font-mono"
                                />
                            </FormField>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowQuickVendorModal(false)}
                                    disabled={isCreatingVendor}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isCreatingVendor || !quickVendorName.trim() || !quickVendorContact.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                    {isCreatingVendor ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                                    Save & Select
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
