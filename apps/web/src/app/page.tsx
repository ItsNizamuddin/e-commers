import Link from "next/link";
import {
    ArrowRight,
    QrCode,
    Sparkles,
    ShieldCheck,
    CheckCircle2,
} from "lucide-react";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import type { ProductResponse } from "@ecommers/types";

// Server Component for fast initial SSR & SEO
export default async function HomePage() {
    let featuredProducts: ProductResponse[] = [];

    try {
        const res = await api.products.list({ limit: 6 });
        featuredProducts = res?.items || [];
    } catch {
        // Fallback gracefully during build or when backend offline
        featuredProducts = [];
    }

    const categories = [
        {
            title: "Cold-Pressed Oils",
            desc: "Extracted under 45°C in wooden ghani to preserve heart-healthy nutrients.",
            badge: "Zero Heat",
            href: "/products?category=cold-pressed-oils",
            color: "from-amber-500/10 to-amber-600/5",
            border: "border-amber-200/80",
            icon: "🫒",
        },
        {
            title: "Artisan Stone-Ground Flours",
            desc: "Single-origin heirloom grains slow-milled on traditional stone chakki.",
            badge: "100% Whole Grain",
            href: "/products?category=artisan-flours",
            color: "from-orange-500/10 to-orange-600/5",
            border: "border-orange-200/80",
            icon: "🌾",
        },
        {
            title: "Raw Honey & Preserves",
            desc: "Unpasteurized wild forest honey and sun-cooked seasonal fruit compotes.",
            badge: "No Added Sugar",
            href: "/products?category=raw-honey-preserves",
            color: "from-yellow-500/10 to-yellow-600/5",
            border: "border-yellow-200/80",
            icon: "🍯",
        },
        {
            title: "Single-Origin Spices",
            desc: "Shade-grown whole spices sun-dried at peak volatile oil maturity.",
            badge: "High Curcumin",
            href: "/products?category=single-origin-spices",
            color: "from-emerald-500/10 to-emerald-600/5",
            border: "border-emerald-200/80",
            icon: "🌿",
        },
    ];

    return (
        <div className="flex flex-col min-h-screen">
            {/* HERO SECTION */}
            <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-zinc-950 text-white py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
                {/* Subtle ambient lighting circles */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
                                <Sparkles size={14} className="text-emerald-400" />
                                <span>Certified Farm-to-Fork Harvest</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
                                Pure Foods. <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                                    Complete Traceability.
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg text-emerald-100/80 max-w-xl leading-relaxed">
                                Sourced directly from verified organic farmer clusters. Every batch is formulated without artificial preservatives, tested for lab safety, and traceable to the exact harvest lot via QR code.
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                                <Link
                                    href="/products"
                                    className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    <span>Explore Fresh Harvest</span>
                                    <ArrowRight size={16} />
                                </Link>

                                <Link
                                    href="/verify-batch"
                                    className="px-6 py-3.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/60 border border-emerald-700/60 text-white font-semibold text-sm flex items-center justify-center gap-2 backdrop-blur-xs transition-colors"
                                >
                                    <QrCode size={16} className="text-emerald-400" />
                                    <span>Verify Any Batch (QR)</span>
                                </Link>
                            </div>

                            {/* Trust badges row */}
                            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-emerald-800/40 text-xs">
                                <div>
                                    <div className="font-bold text-white text-base font-mono">100%</div>
                                    <div className="text-emerald-300/80 mt-0.5">Direct Farm Origin</div>
                                </div>
                                <div>
                                    <div className="font-bold text-white text-base font-mono">FEFO</div>
                                    <div className="text-emerald-300/80 mt-0.5">Peak Freshness First</div>
                                </div>
                                <div>
                                    <div className="font-bold text-white text-base font-mono">0%</div>
                                    <div className="text-emerald-300/80 mt-0.5">Synthetic Fillers</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Batch Preview Card */}
                        <div className="lg:col-span-5">
                            <div className="rounded-2xl p-6 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-emerald-700/40 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-5">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                            <QrCode size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white font-mono">BATCH #LOT-WF-2026-09</div>
                                            <div className="text-[11px] text-emerald-400">Authentic Batch Verification</div>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                                        PASSED QA
                                    </span>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                                        <span className="text-zinc-400">Agricultural Origin</span>
                                        <span className="font-medium text-white">Western Ghats Organic Farmer Collective</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                                        <span className="text-zinc-400">Master Formulation</span>
                                        <span className="font-medium text-white">Cold-Pressed Mustard Formulation</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                                        <span className="text-zinc-400">Moisture & Purity</span>
                                        <span className="font-mono text-emerald-400 font-bold">0.08% (Permissible &lt; 0.25%)</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/60">
                                        <span className="text-zinc-400">Secondary Packaging</span>
                                        <span className="font-medium text-white">500ml Flint Glass Jar + Food-grade Cap</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5">
                                        <span className="text-zinc-400">Fulfillment Rule</span>
                                        <span className="font-medium text-amber-300 font-mono">FEFO Lot Allocation</span>
                                    </div>
                                </div>

                                <Link
                                    href="/verify-batch"
                                    className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
                                >
                                    <span>Try Scanning Your Product Jar</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ARTISANAL CATEGORIES */}
            <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
                            Curated Collections
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                            Shop by Culinary Category
                        </h2>
                    </div>
                    <Link
                        href="/categories"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                        <span>View All Categories</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat) => (
                        <Link
                            key={cat.title}
                            href={cat.href}
                            className={`group relative rounded-2xl p-6 bg-gradient-to-br ${cat.color} bg-white border ${cat.border} hover:shadow-md transition-all flex flex-col justify-between`}
                        >
                            <div className="space-y-3">
                                <div className="text-3xl">{cat.icon}</div>
                                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-zinc-800 shadow-2xs border border-zinc-200/50">
                                    {cat.badge}
                                </span>
                                <h3 className="font-bold text-base text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                    {cat.title}
                                </h3>
                                <p className="text-xs text-zinc-600 leading-relaxed">
                                    {cat.desc}
                                </p>
                            </div>

                            <div className="pt-6 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                                <span>Browse Products</span>
                                <ArrowRight size={13} className="ml-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* FEATURED HARVEST PRODUCTS */}
            {featuredProducts.length > 0 && (
                <section className="py-16 bg-zinc-100/60 border-y border-zinc-200/80 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                            <div>
                                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
                                    Direct from Farm
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                                    Freshly Released Batches
                                </h2>
                            </div>
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                            >
                                <span>View Full Catalog</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featuredProducts.map((p) => {
                                const defaultVariant = p.variants?.[0];
                                const price = defaultVariant?.prices?.[0]?.amount || 0;
                                const currency = defaultVariant?.prices?.[0]?.currency || "INR";
                                const isMinor = price > 1000;

                                return (
                                    <div
                                        key={p.id || p.slug}
                                        className="rounded-2xl bg-white border border-zinc-200/80 overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
                                    >
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    Traceable Batch
                                                </span>
                                                <span className="text-xs font-bold text-zinc-900 font-mono">
                                                    {formatCurrency(price, currency, isMinor)}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-base text-zinc-900 line-clamp-1">
                                                {p.title}
                                            </h3>

                                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                                {p.description}
                                            </p>
                                        </div>

                                        <div className="p-5 pt-0 border-t border-zinc-100 flex items-center justify-between mt-auto">
                                            <span className="text-[11px] font-mono text-zinc-400">
                                                SKU: {defaultVariant?.sku || "N/A"}
                                            </span>
                                            <Link
                                                href={`/products/${p.slug}`}
                                                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                                            >
                                                <span>View Details</span>
                                                <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* FARM-TO-FORK PHILOSOPHY */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                <div className="rounded-3xl bg-emerald-950 text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden">
                    <div className="max-w-2xl space-y-6 relative z-10">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                            <ShieldCheck size={16} />
                            <span>The Ecommers Food Safety Guarantee</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                            We never mix unknown batches. Every bottle has an immutable harvest record.
                        </h2>

                        <p className="text-sm text-emerald-100/80 leading-relaxed">
                            Conventional supply chains blend grains and oils from dozens of brokers. We formulate from pure master recipes, package into inert glass and food-grade tins, and publish lab certificates directly to you.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>Zero Synthetic Additives</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>Paise-Accurate Minor Economics</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>FEFO Shelf Life Protection</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-emerald-100 font-medium">
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                <span>Instant QR Batch Transparency</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/verify-batch"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-sm"
                            >
                                <QrCode size={15} />
                                <span>Enter Batch Verification Portal</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
