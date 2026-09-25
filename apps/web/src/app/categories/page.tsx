import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Leaf, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import type { CategoryResponse } from "@ecommers/types";

export const metadata = {
    title: "Culinary Categories & Collections | ECOMMERS",
    description: "Browse our farm-direct artisanal culinary categories: cold-pressed oils, stone-ground heirloom flours, wild honey, and single-origin spices.",
};

export default async function CategoriesPage() {
    let categories: CategoryResponse[] = [];

    try {
        categories = await api.categories.list();
    } catch {
        categories = [];
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-10 pb-6 border-b border-zinc-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-2">
                        <Link href="/" className="hover:underline flex items-center gap-1">
                            <ArrowLeft size={13} /> Home
                        </Link>
                        <span>/</span>
                        <span className="text-zinc-600">Categories</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                                Farm-to-Table Collections
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
                                Discover pure agricultural foods categorized by their traditional extraction and milling craft.
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
                            <Sparkles size={14} className="text-emerald-600" />
                            <span>100% Traceable Harvest</span>
                        </div>
                    </div>
                </div>

                {/* Categories Grid */}
                {categories.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-zinc-200 p-12 text-center text-zinc-500 space-y-3">
                        <Leaf size={32} className="mx-auto text-emerald-600" />
                        <h3 className="font-bold text-zinc-800 text-base">Collections are being harvested</h3>
                        <p className="text-xs max-w-sm mx-auto">
                            Check back soon or browse all current farm releases.
                        </p>
                        <Link
                            href="/products"
                            className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            Browse All Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat) => (
                            <Link
                                key={cat.id || cat.slug}
                                href={`/products?category=${cat.slug}`}
                                className="group rounded-2xl bg-white border border-zinc-200/80 p-6 hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Leaf size={22} />
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-lg text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                            {cat.name}
                                        </h3>
                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-3 leading-relaxed">
                                            {cat.description || "Freshly formulated artisanal goods with complete lot verification."}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                                    <span>Explore Collection</span>
                                    <ArrowRight size={14} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
