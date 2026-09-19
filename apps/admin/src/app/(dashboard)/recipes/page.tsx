"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useGetRecipesQuery } from "../../../store/api";
import type { Recipe } from "@ecommers/types";
import {
    Card,
    Badge,
    Button,
    Spinner,
    Pagination,
    toast,
} from "@ecommers/ui";
import {
    ClipboardList,
    Plus,
    RefreshCw,
    TrendingUp,
    Scale,
    Cpu,
    Printer,
    Edit2,
    LayoutList,
    LayoutGrid,
    Calendar,
    Package,
} from "lucide-react";
import { BatchSheetModal } from "@/components/manufacturing/batch-sheet-modal";

export default function RecipesPage() {
    const {
        data: recipes = [],
        isLoading: loading,
        isFetching: refreshing,
        refetch,
    } = useGetRecipesQuery();

    const [costingStrategy, setCostingStrategy] = useState<"WAC" | "HIGHEST">("WAC");
    const [batchModalRecipe, setBatchModalRecipe] = useState<Recipe | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const totalItems = recipes.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const paginatedRecipes = useMemo(() => {
        const start = (page - 1) * pageSize;
        return recipes.slice(start, start + pageSize);
    }, [recipes, page, pageSize]);

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-neutral-800/80 pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                            <ClipboardList size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Recipes & Bill of Materials (BOM)
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-neutral-400">
                                Product formulas, ingredient proportions, cooking loss/wastage, packaging, and versioned costing
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={refreshing}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </Button>
                    <Link href="/recipes/new">
                        <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold">
                            <Plus size={14} />
                            <span>Formulate New Recipe</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Costing Strategy Switcher & View Mode Toolbar */}
            <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white dark:from-blue-950/20 dark:via-neutral-900/40 dark:to-neutral-900 border border-blue-200/70 dark:border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Active Costing Simulation Mode
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                            Switch calculation basis to preview true inventory cost vs replacement market cost
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Strategy Switcher */}
                    <div className="flex items-center bg-white dark:bg-[#151515] p-1 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setCostingStrategy("WAC")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${costingStrategy === "WAC"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                }`}
                        >
                            WAC Mode
                        </button>
                        <button
                            type="button"
                            onClick={() => setCostingStrategy("HIGHEST")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${costingStrategy === "HIGHEST"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                                }`}
                        >
                            Highest Rate
                        </button>
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center bg-white dark:bg-[#151515] p-1 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "grid"
                                    ? "bg-slate-900 text-white dark:bg-neutral-800 shadow-xs"
                                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white"
                            }`}
                            title="Formula Card Grid"
                        >
                            <LayoutGrid size={13} />
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "table"
                                    ? "bg-slate-900 text-white dark:bg-neutral-800 shadow-xs"
                                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white"
                            }`}
                            title="Consolidated Table View"
                        >
                            <LayoutList size={13} />
                            <span>Table</span>
                        </button>
                    </div>

                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 shrink-0">
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
            </div>

            {/* Recipes Content: Grid or Consolidated Table */}
            {loading ? (
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-20 flex flex-col items-center justify-center">
                    <Spinner size="lg" />
                    <p className="text-xs text-slate-400 mt-2 font-medium">Loading recipes & BOM formulas...</p>
                </Card>
            ) : recipes.length === 0 ? (
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-16 text-center">
                    <ClipboardList size={32} className="text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Recipes Formulated Yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Formulate your first recipe by linking raw materials to finished products and variants.
                    </p>
                    <Link href="/recipes/new">
                        <Button variant="primary" size="sm" className="mt-4 gap-1.5 text-xs font-semibold">
                            <Plus size={13} />
                            <span>Formulate Recipe</span>
                        </Button>
                    </Link>
                </Card>
            ) : viewMode === "grid" ? (
                /* Card Grid View */
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedRecipes.map((r) => {
                            const productObj = (r as any).productId;
                            const variantObj = productObj?.variants?.find((v: any) => v.id === r.variantId?.toString()) || productObj?.variants?.[0];
                            const sellingPrice = variantObj?.prices?.[0]?.amount || 0;
                            const unitCost = costingStrategy === "WAC" ? (r.estimatedCostWac || 0) : (r.estimatedCostHighest || 0);
                            const grossMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;

                            return (
                                <Card
                                    key={r.id}
                                    className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Header: Recipe Name & Version */}
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={`/recipes/${r.id}`} className="group flex-1">
                                                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                                    {r.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                                        {r.code}
                                                    </span>
                                                    <Badge variant="neutral" size="sm">
                                                        v{r.version}
                                                    </Badge>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Assigned Product */}
                                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-neutral-900/60 border border-slate-100 dark:border-neutral-800/80">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                                Finished Product Output
                                            </div>
                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                {productObj?.title || "Finished Product"}
                                            </div>
                                            {variantObj && (
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    Variant: {variantObj.title || "Default"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Production Specifications */}
                                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800/80 text-center">
                                            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-neutral-900/40">
                                                <span className="text-[10px] text-slate-400 block font-medium">Batch Yield</span>
                                                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {r.batchYield.quantity} {r.batchYield.unit}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-neutral-900/40">
                                                <span className="text-[10px] text-slate-400 block font-medium">Shelf Life</span>
                                                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {r.shelfLifeDays}d
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-neutral-900/40">
                                                <span className="text-[10px] text-slate-400 block font-medium">Ingredients</span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {r.ingredients.length} + {r.packagingMaterials?.length || 0}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Financials / Economics */}
                                        <div className="mt-3 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800/80 bg-gradient-to-br from-slate-50 to-white dark:from-neutral-900/40 dark:to-neutral-900">
                                            <div className="flex items-baseline justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Unit Cost ({costingStrategy}):</span>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    ₹{unitCost.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline justify-between text-xs mt-1.5">
                                                <span className="text-slate-500 font-medium">Selling Price:</span>
                                                {sellingPrice > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                            ₹{sellingPrice.toFixed(2)}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                            grossMargin > 40
                                                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                                : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                                                        }`}>
                                                            {grossMargin.toFixed(0)}% margin
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[11px]">Unset</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Toolbar */}
                                    <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setBatchModalRecipe(r)}
                                                className="h-7 text-[11px] px-2 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 font-medium"
                                            >
                                                <Printer size={11} />
                                                <span>Slip</span>
                                            </Button>
                                            <Link href={`/recipes/${r.id}`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-[11px] px-2 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-300 font-medium"
                                                >
                                                    <Edit2 size={11} />
                                                    <span>Edit</span>
                                                </Button>
                                            </Link>
                                        </div>
                                        <Link href={`/manufacturing?recipeId=${r.id}`}>
                                            <Button variant="primary" size="sm" className="h-7 text-[11px] px-2.5 gap-1 font-semibold">
                                                <Cpu size={11} />
                                                <span>Produce</span>
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {totalItems > 0 && (
                        <Card className="p-3 bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                onPageChange={setPage}
                            />
                        </Card>
                    )}
                </div>
            ) : (
                /* Consolidated Table View */
                <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                <tr className="text-slate-500 font-semibold">
                                    <th className="py-3 px-4">Recipe Formula & Assigned Product</th>
                                    <th className="py-3 px-3">Yield & Shelf Life</th>
                                    <th className="py-3 px-3">BOM Composition</th>
                                    <th className="py-3 px-3 text-right">
                                        Cost & Margin ({costingStrategy === "WAC" ? "WAC" : "Replacement"})
                                    </th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                                {paginatedRecipes.map((r) => {
                                    const productObj = (r as any).productId;
                                    const variantObj = productObj?.variants?.find((v: any) => v.id === r.variantId?.toString()) || productObj?.variants?.[0];
                                    const sellingPrice = variantObj?.prices?.[0]?.amount || 0;
                                    const unitCost = costingStrategy === "WAC" ? (r.estimatedCostWac || 0) : (r.estimatedCostHighest || 0);
                                    const grossMargin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;

                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                                            {/* Column 1: Recipe & Product */}
                                            <td className="py-3 px-4">
                                                <Link href={`/recipes/${r.id}`} className="group block">
                                                    <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {r.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                                            {r.code}
                                                        </span>
                                                        <Badge variant="neutral" size="sm">
                                                            v{r.version}
                                                        </Badge>
                                                        <span className="text-[11px] text-slate-400">•</span>
                                                        <span className="text-[11px] text-slate-600 dark:text-neutral-400 font-medium truncate max-w-[200px]">
                                                            {productObj?.title || "Finished Product"} {variantObj?.title ? `(${variantObj.title})` : ""}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </td>

                                            {/* Column 2: Yield & Shelf Life */}
                                            <td className="py-3 px-3">
                                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {r.batchYield.quantity} {r.batchYield.unit}
                                                </div>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {r.shelfLifeDays} days shelf life
                                                </span>
                                            </td>

                                            {/* Column 3: BOM Composition */}
                                            <td className="py-3 px-3">
                                                <span className="text-slate-800 dark:text-slate-200 font-semibold block">
                                                    {r.ingredients.length} raw materials
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {r.packagingMaterials?.length || 0} packaging items
                                                </span>
                                            </td>

                                            {/* Column 4: Cost & Margin */}
                                            <td className="py-3 px-3 text-right">
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                                                    ₹{unitCost.toFixed(2)} / unit
                                                </span>
                                                {sellingPrice > 0 ? (
                                                    <div className="flex items-center justify-end gap-1.5 text-[11px] mt-0.5">
                                                        <span className="font-mono text-slate-500">₹{sellingPrice.toFixed(2)}</span>
                                                        <span className={`font-bold ${grossMargin > 40 ? "text-emerald-600" : "text-amber-600"}`}>
                                                            ({grossMargin.toFixed(0)}% margin)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[11px]">No Price</span>
                                                )}
                                            </td>

                                            {/* Column 5: Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setBatchModalRecipe(r)}
                                                        className="h-7 text-[11px] px-2.5 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 font-medium"
                                                    >
                                                        <Printer size={12} />
                                                        <span>Batch Slip</span>
                                                    </Button>
                                                    <Link href={`/recipes/${r.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-[11px] px-2.5 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-300 font-medium"
                                                            title="Edit Recipe BOM Formula"
                                                        >
                                                            <Edit2 size={12} />
                                                            <span>Edit</span>
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/manufacturing?recipeId=${r.id}`}>
                                                        <Button variant="primary" size="sm" className="h-7 text-[11px] px-2.5 gap-1 font-semibold">
                                                            <Cpu size={12} />
                                                            <span>Produce</span>
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
                </Card>
            )}

            {/* Production Batch Slip & Scaled Work Order Modal */}
            <BatchSheetModal
                isOpen={!!batchModalRecipe}
                onClose={() => setBatchModalRecipe(null)}
                recipe={batchModalRecipe}
                onBatchCreated={(batchNum) => {
                    toast.success(`Production batch ${batchNum} scheduled!`);
                    refetch();
                }}
            />
        </div>
    );
}
