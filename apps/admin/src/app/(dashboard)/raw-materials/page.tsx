"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { RawMaterial, RawMaterialCategory } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Input,
    Spinner,
    toast,
} from "@ecommers/ui";
import {
    Boxes,
    Plus,
    Search,
    AlertTriangle,
    RefreshCw,
    Truck,
    Layers,
    CalendarCheck,
    Scale,
    ExternalLink,
    Edit3,
    Sparkles,
} from "lucide-react";

const CATEGORIES: Array<{ label: string; value: string }> = [
    { label: "All Categories", value: "ALL" },
    { label: "Ingredients", value: "INGREDIENT" },
    { label: "Dairy", value: "DAIRY" },
    { label: "Sweeteners", value: "SWEETENER" },
    { label: "Spices", value: "SPICE" },
    { label: "Oils & Fats", value: "OIL" },
    { label: "Grains & Flours", value: "GRAIN" },
    { label: "Packaging", value: "PACKAGING" },
    { label: "Other", value: "OTHER" },
];

export default function RawMaterialsPage() {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [selectedUsage, setSelectedUsage] = useState<"ALL" | "RAW_MATERIAL" | "SELLABLE" | "BOTH">("ALL");

    const fetchMaterials = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await api.manufacturing.listRawMaterials({
                category: selectedCategory !== "ALL" ? selectedCategory : undefined,
                usage: selectedUsage !== "ALL" ? selectedUsage : undefined,
                search: searchQuery.trim() || undefined,
            });
            setMaterials(data || []);
        } catch (err: unknown) {
            console.error("Failed to load raw materials:", err);
            toast.error("Failed to load raw materials.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory, selectedUsage, searchQuery]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const total = materials.length;
        let totalValuation = 0;
        let lowStockCount = 0;
        let dualUseCount = 0;

        for (const m of materials) {
            totalValuation += (m.currentStock || 0) * (m.averageCost || 0);
            if ((m.currentStock || 0) <= (m.reorderThreshold || 0)) {
                lowStockCount++;
            }
            if (m.usage === "BOTH") {
                dualUseCount++;
            }
        }

        return {
            total,
            totalValuation: Math.round(totalValuation),
            lowStockCount,
            dualUseCount,
        };
    }, [materials]);

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                            <Boxes size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Raw Materials Catalog
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                Manage ingredients, packaging, dual-use retail items, and weighted average cost (WAC)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchMaterials(true)}
                        disabled={refreshing}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </Button>
                    <Link href="/raw-materials/purchases/new">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-900/60">
                            <Truck size={13} />
                            <span>Record Intake</span>
                        </Button>
                    </Link>
                    <Link href="/raw-materials/new">
                        <Button
                            variant="primary"
                            size="sm"
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Plus size={14} />
                            <span>New Material</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Top Quick Links to Sub-Modules */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                    href="/raw-materials"
                    className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-center justify-between hover:shadow-xs transition-all"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                            <Boxes size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Catalog</p>
                            <p className="text-[11px] text-slate-500">Stock & WAC</p>
                        </div>
                    </div>
                    <Badge variant="primary" size="sm">{metrics.total}</Badge>
                </Link>

                <Link
                    href="/raw-materials/purchases"
                    className="p-3.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl flex items-center justify-between hover:border-blue-500 transition-all shadow-xs"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <Truck size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Intakes</p>
                            <p className="text-[11px] text-slate-500">Vendor & Farm</p>
                        </div>
                    </div>
                    <ExternalLink size={13} className="text-slate-400" />
                </Link>

                <Link
                    href="/raw-materials/lots"
                    className="p-3.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl flex items-center justify-between hover:border-blue-500 transition-all shadow-xs"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                            <CalendarCheck size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Active Lots</p>
                            <p className="text-[11px] text-slate-500">FEFO & Expiry</p>
                        </div>
                    </div>
                    <ExternalLink size={13} className="text-slate-400" />
                </Link>

                <Link
                    href="/manufacturing/repackaging"
                    className="p-3.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-neutral-800 rounded-xl flex items-center justify-between hover:border-blue-500 transition-all shadow-xs"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">Repackaging</p>
                            <p className="text-[11px] text-slate-500">Bulk to Retail</p>
                        </div>
                    </div>
                    <ExternalLink size={13} className="text-slate-400" />
                </Link>
            </div>

            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Total Materials</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                            <Boxes size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{metrics.total}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Catalog SKUs</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Total Valuation</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <Scale size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                        ₹{metrics.totalValuation.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">At weighted average cost</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Dual-Use Items</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                            <Sparkles size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                        {metrics.dualUseCount}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Bulk + Retail Sellable</p>
                </Card>

                <Card className="p-4 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Low Stock Alert</span>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${metrics.lowStockCount > 0 ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600" : "bg-slate-50 dark:bg-neutral-800 text-slate-400"}`}>
                            <AlertTriangle size={14} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${metrics.lowStockCount > 0 ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
                        {metrics.lowStockCount}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Below reorder threshold</p>
                </Card>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111111] p-3 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by code or material name..."
                        className="pl-8 text-xs h-9"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Usage:</span>
                    {(["ALL", "RAW_MATERIAL", "SELLABLE", "BOTH"] as const).map((u) => (
                        <button
                            key={u}
                            type="button"
                            onClick={() => setSelectedUsage(u)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                selectedUsage === u
                                    ? "bg-purple-600 text-white"
                                    : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                            }`}
                        >
                            {u === "ALL" ? "All" : u === "RAW_MATERIAL" ? "Raw" : u === "SELLABLE" ? "Sellable" : "Both (Dual)"}
                        </button>
                    ))}
                    <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-1" />
                    {CATEGORIES.slice(0, 4).map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setSelectedCategory(c.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === c.value
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800"
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Catalog Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2 font-medium">Loading catalog...</p>
                    </div>
                ) : materials.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <Boxes size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Raw Materials Found</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            {searchQuery ? "No material matches your search query." : "Get started by adding your first ingredient or packaging material."}
                        </p>
                        <Link href="/raw-materials/new">
                            <Button
                                variant="primary"
                                size="sm"
                                className="mt-4 gap-1.5 text-xs font-semibold"
                            >
                                <Plus size={13} />
                                <span>Add Material</span>
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 font-semibold">
                                    <th className="py-3 px-4">Material Code & Name</th>
                                    <th className="py-3 px-3">Usage</th>
                                    <th className="py-3 px-3">Category</th>
                                    <th className="py-3 px-3 text-right">Current Stock</th>
                                    <th className="py-3 px-3 text-right">Avg Cost (WAC)</th>
                                    <th className="py-3 px-3 text-right">Latest Price</th>
                                    <th className="py-3 px-3 text-right">Stock Valuation</th>
                                    <th className="py-3 px-3 text-center">Reorder Level</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                {materials.map((m) => {
                                    const isLow = m.currentStock <= m.reorderThreshold;
                                    const valuation = (m.currentStock || 0) * (m.averageCost || 0);

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                                                        <Scale size={14} />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {m.name}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                                                            {m.code}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                {m.usage === "BOTH" ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold text-[10px] inline-flex items-center gap-1">
                                                        <Sparkles size={11} />
                                                        <span>Dual Use (Both)</span>
                                                    </span>
                                                ) : m.usage === "SELLABLE" ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                                                        Sellable Retail
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-[10px]">
                                                        Raw Material
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <Badge variant="neutral" size="sm">
                                                    {m.category}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isLow && (
                                                        <span title="Low stock alert">
                                                            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                                                        </span>
                                                    )}
                                                    <span className={`font-mono font-bold ${isLow ? "text-amber-600" : "text-slate-800 dark:text-slate-200"}`}>
                                                        {m.currentStock} {m.unit}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                ₹{m.averageCost.toFixed(2)} / {m.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-600 dark:neutral-400">
                                                ₹{m.lastPurchasePrice.toFixed(2)} / {m.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                ₹{valuation.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="text-slate-500 font-mono text-[11px]">
                                                    {m.reorderThreshold} {m.unit}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link href={`/raw-materials/${m.id}`}>
                                                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 text-blue-600 hover:bg-blue-50" title="Edit material details">
                                                            <Edit3 size={11} className="mr-1" />
                                                            <span>Edit</span>
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/raw-materials/lots?rawMaterialId=${m.id}`}>
                                                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" title="View active lots">
                                                            Lots
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/raw-materials/ledger?rawMaterialId=${m.id}`}>
                                                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" title="View movement ledger">
                                                            Ledger
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
