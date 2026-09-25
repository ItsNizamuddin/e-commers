import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, ShoppingBag } from "lucide-react";
import { api } from "../../lib/api";
import { ProductCard } from "../../components/products/ProductCard";
import { ProductFilters } from "../../components/products/ProductFilters";
import { ProductSortSelect } from "../../components/products/ProductSortSelect";
import type { CategoryResponse, ProductResponse } from "@ecommers/types";

interface ProductsPageProps {
    searchParams: Promise<{
        category?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: string;
        page?: string;
        search?: string;
    }>;
}

export const metadata = {
    title: "Artisanal Foods & Fresh Harvest Catalog | ECOMMERS",
    description: "Explore our collection of certified pure cold-pressed oils, stone-ground flours, and organic preserves with batch traceability.",
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
    const params = await searchParams;

    let categories: CategoryResponse[] = [];
    let products: ProductResponse[] = [];
    let totalProducts = 0;

    try {
        categories = await api.categories.list();
    } catch {
        categories = [];
    }

    // Match category slug to categoryId if provided
    let categoryId: string | undefined = undefined;
    let selectedCategory: CategoryResponse | undefined = undefined;
    if (params.category) {
        selectedCategory = categories.find((c) => c.slug === params.category);
        categoryId = selectedCategory?.id;
    }

    const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
    const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
    const sortBy = params.sort === "price_asc" || params.sort === "price_desc" ? "price" : "createdAt";
    const sortOrder = params.sort === "price_asc" ? "asc" : "desc";

    try {
        const res = await api.products.list({
            categoryId,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder,
            limit: 24,
            status: "PUBLISHED",
        });
        products = res?.items || [];
        totalProducts = res?.pagination?.total ?? products.length;
    } catch {
        products = [];
        totalProducts = 0;
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Banner */}
                <div className="mb-8 pb-6 border-b border-zinc-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-2">
                        <Link href="/" className="hover:underline flex items-center gap-1">
                            <ArrowLeft size={13} /> Home
                        </Link>
                        <span>/</span>
                        <span className="text-zinc-600">
                            {selectedCategory ? selectedCategory.name : "All Products"}
                        </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                                {selectedCategory ? selectedCategory.name : "Fresh Farm Catalog"}
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
                                {selectedCategory?.description ||
                                    "Direct farm-to-table culinary ingredients formulated with zero artificial additives, verified with QR batch traceability."}
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                            <Sparkles size={14} className="text-emerald-600" />
                            <span>100% FEFO Fresh Dispatch</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Layout (Sidebar + Grid) */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Filter Sidebar */}
                    <ProductFilters
                        categories={categories}
                        selectedCategorySlug={params.category}
                        currentMinPrice={minPrice}
                        currentMaxPrice={maxPrice}
                    />

                    {/* Product Grid Area */}
                    <div className="flex-1 w-full min-w-0">
                        {/* Results Count & Sort Dropdown */}
                        <div className="flex items-center justify-between mb-6 bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
                            <div className="text-xs text-zinc-600 font-medium">
                                Showing <strong className="text-zinc-900 font-bold">{products.length}</strong> of{" "}
                                <strong className="text-zinc-900 font-bold">{totalProducts}</strong> foods
                            </div>

                            <ProductSortSelect currentSort={params.sort} />
                        </div>

                        {/* Product Cards Grid */}
                        {products.length === 0 ? (
                            <div className="rounded-2xl bg-white border border-zinc-200/80 p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                                    <ShoppingBag size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-zinc-800">No foods matched your filter</h3>
                                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                                        Try widening your price range or choosing a different culinary category.
                                    </p>
                                </div>
                                <Link
                                    href="/products"
                                    className="inline-block px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                                >
                                    Reset Filters
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id || product.slug} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
