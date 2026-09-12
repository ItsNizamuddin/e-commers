"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../../../lib/api";
import type {
    RawMaterial,
    RawMaterialUnit,
    RawMaterialSourceType,
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

    // External Vendor
    const [vendorName, setVendorName] = useState("");
    const [vendorContact, setVendorContact] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");

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

    useEffect(() => {
        setLoadingMaterials(true);
        api.manufacturing
            .listRawMaterials({ isActive: true })
            .then((data) => {
                setMaterials(data || []);
                if (data && data.length > 0) {
                    setSelectedMaterialId(data[0]!.id);
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
        return materials.find((m) => m.id === selectedMaterialId);
    }, [materials, selectedMaterialId]);

    const handleMaterialChange = (matId: string) => {
        setSelectedMaterialId(matId);
        const mat = materials.find((m) => m.id === matId);
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <FormField label="Vendor / Supplier Name" required>
                                <Input
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
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
                                    <option value="OPERATIONAL_COST">Operational Labor/Fuel Cost</option>
                                    <option value="MARKET_RATE">Wholesale Mandi Market Rate</option>
                                    <option value="ZERO_COST">Zero Cost (Sunk/Free)</option>
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
                                {materials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.code}) — Current: {m.currentStock} {m.unit}
                                    </option>
                                ))}
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
        </div>
    );
}
