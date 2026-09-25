import React from "react";
import Link from "next/link";
import { ArrowLeft, Search as SearchIcon, ShoppingBag, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { ProductCard } from "../../components/products/ProductCard";
import type { ProductResponse } from "@ecommers/types";

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
    }>;
}

export const metadata = {
    title: "Search Artisanal Foods | ECOMMERS",
    description: "Search farm-to-fork organic foods with complete batch traceability and purity assurance.",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const query = params.q?.trim() || "";

    let products: ProductResponse[] = [];
    let totalCount = 0;

    if (query) {
        try {
            const res = await api.products.list({
                search: query,
                limit: 30,
                status: "PUBLISHED",
            });
            products = res?.items || [];
            totalCount = res?.pagination?.total ?? products.length;
        } catch {
            products = [];
            totalCount = 0;
        }
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumbs */}
                <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Link href="/" className="hover:underline flex items-center gap-1">
                        <ArrowLeft size={13} /> Home
                    </Link>
                    <span>/</span>
                    <span className="text-zinc-600">Search</span>
                </div>

                {/* Search Bar & Header */}
                <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 mb-8 shadow-xs space-y-4">
                    <div className="max-w-xl">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                            {query ? `Search results for "${query}"` : "Search Farm Catalog"}
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                            Find organic culinary formulations, stone-ground flours, and wood-pressed oils.
                        </p>
                    </div>

                    <form action="/search" method="GET" className="relative max-w-xl">
                        <SearchIcon
                            size={18}
                            className="absolute left-3.5 top-3.5 text-zinc-400 pointer-events-none"
                        />
                        <input
                            type="search"
                            name="q"
                            defaultValue={query}
                            placeholder="Try 'Cold-Pressed', 'Mustard', 'Flour', 'Honey'..."
                            className="w-full bg-zinc-100 hover:bg-zinc-50 focus:bg-white text-zinc-900 pl-11 pr-24 py-3 rounded-xl text-sm border border-zinc-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-400 font-medium"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Results Section */}
                {query === "" ? (
                    <div className="rounded-2xl bg-white border border-zinc-200 p-12 text-center text-zinc-500 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-zinc-800">Looking for something specific?</h3>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                                Enter an ingredient, craft technique, or product name above to discover our farm-direct batches.
                            </p>
                        </div>
                        <div className="pt-2 flex flex-wrap justify-center gap-2">
                            {["Mustard Oil", "A2 Ghee", "Emmer Wheat", "Wild Honey", "Stone Ground"].map((tag) => (
                                <Link
                                    key={tag}
                                    href={`/search?q=${encodeURIComponent(tag)}`}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 text-zinc-600 text-xs font-semibold transition-colors"
                                >
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-zinc-200 p-12 text-center text-zinc-500 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                            <ShoppingBag size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-base text-zinc-800">
                                No products found for &quot;{query}&quot;
                            </h3>
                            <p className="text-xs text-zinc-500 max-w-md mx-auto">
                                We couldn&apos;t find an exact match. Try using broader keywords or explore our curated categories.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/products"
                                className="inline-block px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                            >
                                Browse All Foods
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="text-xs text-zinc-500 font-medium mb-6">
                            Showing <strong className="text-zinc-900 font-bold">{products.length}</strong> of{" "}
                            <strong className="text-zinc-900 font-bold">{totalCount}</strong> matching foods
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.map((product) => (
                                <ProductCard key={product.id || product.slug} product={product} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
