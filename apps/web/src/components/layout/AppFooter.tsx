import Link from "next/link";
import { Leaf, ShieldCheck, QrCode, Truck, RefreshCw } from "lucide-react";

export function AppFooter() {
    return (
        <footer className="bg-zinc-950 text-zinc-300 border-t border-zinc-800">
            {/* Trust Badges Bar */}
            <div className="border-b border-zinc-800/80 bg-zinc-900/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/50 shrink-0">
                                <QrCode size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-100">100% Traceable</h4>
                                <p className="text-xs text-zinc-400">Scan any batch to view farm harvest origin</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/50 shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-100">Lab-Certified Food</h4>
                                <p className="text-xs text-zinc-400">Moisture & microbial safety tested per run</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/50 shrink-0">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-100">FEFO Fresh Dispatch</h4>
                                <p className="text-xs text-zinc-400">Freshly bottled goods dispatched within 24h</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/50 shrink-0">
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-100">Pure Formulations</h4>
                                <p className="text-xs text-zinc-400">Zero artificial preservatives, colorants, or fillers</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Links Directory */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                    {/* Brand Overview */}
                    <div className="lg:col-span-2 space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                                <Leaf size={18} className="stroke-[2.5]" />
                            </div>
                            <span className="font-bold text-lg text-white tracking-tight">ECOMMERS</span>
                        </Link>
                        <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
                            Next-generation farm-to-table platform connecting consumers with pure, artisanal agricultural foods. Built on full supply chain traceability and strict FEFO quality standards.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/verify-batch"
                                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors"
                            >
                                <QrCode size={14} />
                                <span>Lookup Batch Test Report →</span>
                            </Link>
                        </div>
                    </div>

                    {/* Shop Categories */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100">Explore Catalog</h4>
                        <ul className="space-y-2 text-xs text-zinc-400">
                            <li><Link href="/products" className="hover:text-emerald-400 transition-colors">All Products</Link></li>
                            <li><Link href="/categories" className="hover:text-emerald-400 transition-colors">Categories</Link></li>
                            <li><Link href="/products?category=cold-pressed-oils" className="hover:text-emerald-400 transition-colors">Cold-Pressed Oils</Link></li>
                            <li><Link href="/products?category=artisan-flours" className="hover:text-emerald-400 transition-colors">Artisan Flours</Link></li>
                            <li><Link href="/products?category=raw-honey-preserves" className="hover:text-emerald-400 transition-colors">Raw Honey & Preserves</Link></li>
                        </ul>
                    </div>

                    {/* Transparency & Quality */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100">Traceability</h4>
                        <ul className="space-y-2 text-xs text-zinc-400">
                            <li><Link href="/verify-batch" className="hover:text-emerald-400 transition-colors">Batch Verification</Link></li>
                            <li><Link href="/quality" className="hover:text-emerald-400 transition-colors">Lab Safety Standards</Link></li>
                            <li><Link href="/farmers" className="hover:text-emerald-400 transition-colors">Farmer Partner Network</Link></li>
                            <li><Link href="/packaging" className="hover:text-emerald-400 transition-colors">Eco Packaging Specs</Link></li>
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-100">Customer Support</h4>
                        <ul className="space-y-2 text-xs text-zinc-400">
                            <li><Link href="/account/orders" className="hover:text-emerald-400 transition-colors">Track Your Order</Link></li>
                            <li><Link href="/shipping" className="hover:text-emerald-400 transition-colors">Shipping & Delivery</Link></li>
                            <li><Link href="/returns" className="hover:text-emerald-400 transition-colors">Refunds & Returns</Link></li>
                            <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact Support</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Legal & Currency Notice */}
                <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
                    <p>© {new Date().getFullYear()} Ecommers Platform. All rights reserved.</p>
                    <p className="flex items-center gap-4">
                        <span>Minor-Unit Accuracy (Paise / Cents)</span>
                        <span>•</span>
                        <span>FSSAI Certified</span>
                        <span>•</span>
                        <span>Fulfillment via FEFO</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
