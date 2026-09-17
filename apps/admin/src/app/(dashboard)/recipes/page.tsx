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
    Calendar,
    ArrowRight,
    Sparkles,
    Printer,
    Edit2,
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

            {/* Costing Strategy Switcher Toolbar */}
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

                <div className="flex items-center bg-white dark:bg-[#151515] p-1 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs">
                    <button
                        type="button"
                        onClick={() => setCostingStrategy("WAC")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            costingStrategy === "WAC"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                        }`}
                    >
                        Weighted Average Cost (WAC)
                    </button>
                    <button
                        type="button"
                        onClick={() => setCostingStrategy("HIGHEST")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            costingStrategy === "HIGHEST"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900"
                        }`}
                    >
                        Highest / Replacement Rate
                    </button>
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

            {/* Recipes Table */}
            <Card className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Spinner size="lg" />
                        <p className="text-xs text-slate-400 mt-2">Loading recipes & BOM formulas...</p>
                    </div>
                ) : recipes.length === 0 ? (
                    <div className="text-center py-16 px-4">
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
                    </div>
                ) : (
                    <>
                        <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[300px]">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-neutral-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-neutral-800 shadow-xs">
                                    <tr className="text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Recipe & Version</th>
                                        <th className="py-3 px-3">Assigned Finished Product</th>
                                        <th className="py-3 px-3">Batch Yield</th>
                                        <th className="py-3 px-3">Shelf Life</th>
                                        <th className="py-3 px-3">Ingredients / Packaging</th>
                                        <th className="py-3 px-3 text-right">
                                            Unit Cost ({costingStrategy === "WAC" ? "WAC" : "Replacement"})
                                        </th>
                                        <th className="py-3 px-3 text-right">Selling Price & Margin</th>
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
                                            <td className="py-3 px-4">
                                                <Link href={`/recipes/${r.id}`} className="group block">
                                                    <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {r.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                                            {r.code}
                                                        </span>
                                                        <Badge variant="neutral" size="sm">
                                                            v{r.version}
                                                        </Badge>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                                    {productObj?.title || "Finished Product"}
                                                </span>
                                                {variantObj && (
                                                    <span className="text-[11px] text-slate-500">
                                                        Variant: {variantObj.title || "Default"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {r.batchYield.quantity} {r.batchYield.unit}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-slate-600 dark:text-neutral-300">
                                                {r.shelfLifeDays} days
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {r.ingredients.length} raw mat, {r.packagingMaterials?.length || 0} pkg
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                ₹{unitCost.toFixed(2)} / unit
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                {sellingPrice > 0 ? (
                                                    <div>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                                            ₹{sellingPrice.toFixed(2)}
                                                        </span>
                                                        <span className={`text-[11px] font-bold ${grossMargin > 40 ? "text-emerald-600" : "text-amber-600"}`}>
                                                            {grossMargin.toFixed(1)}% margin
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[11px]">No Price</span>
                                                )}
                                            </td>
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
                                                            <span>Edit Recipe</span>
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
                </>
            )}
        </Card>

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
