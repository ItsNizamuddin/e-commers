"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ShoppingBag,
    Zap,
    ShieldCheck,
    Truck,
    RotateCcw,
    QrCode,
    ArrowRight,
    Star,
    Minus,
    Plus,
} from "lucide-react";
import type { ProductResponse, ProductVariantResponse, ProductReviewsResponse } from "@ecommers/types";
import { ProductGallery } from "./ProductGallery";
import { ProductNutritionPanel } from "./ProductNutritionPanel";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { formatCurrency } from "../../lib/format";
import { api } from "../../lib/api";
import { useAppDispatch } from "../../store";
import { setCart, setCartOpen } from "../../store/cart-slice";
import { toast, Spinner } from "@ecommers/ui";

export interface ProductDetailClientProps {
    product: ProductResponse;
    categoryName?: string;
    initialReviews?: ProductReviewsResponse | null;
}

export function ProductDetailClient({
    product,
    categoryName,
    initialReviews,
}: ProductDetailClientProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const variants = product.variants || [];
    const [selectedVariant, setSelectedVariant] = useState<ProductVariantResponse>(
        variants[0] || ({} as ProductVariantResponse)
    );
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const [isBuyingNow, setIsBuyingNow] = useState(false);

    const priceObj = selectedVariant.prices?.[0];
    const amount = priceObj?.amount ?? 0;
    const compareAt = priceObj?.compareAtAmount;
    const currency = priceObj?.currency || product.baseCurrency || "INR";
    const isMinor = amount > 1000;

    const discountPercentage =
        compareAt && compareAt > amount
            ? Math.round(((compareAt - amount) / compareAt) * 100)
            : 0;

    const handleAddToCart = async () => {
        if (!selectedVariant.id) {
            toast.error("Please select a pack size");
            return;
        }

        try {
            setIsAdding(true);
            const updated = await api.cart.addItem({
                productId: product.id,
                variantId: selectedVariant.id,
                quantity,
                currency,
            });

            dispatch(setCart(updated));
            dispatch(setCartOpen(true));
            toast.success(`${quantity}x ${product.title} added to your basket!`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to add to basket";
            toast.error(message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleBuyNow = async () => {
        if (!selectedVariant.id) {
            toast.error("Please select a pack size");
            return;
        }

        try {
            setIsBuyingNow(true);
            const updated = await api.cart.addItem({
                productId: product.id,
                variantId: selectedVariant.id,
                quantity,
                currency,
            });

            dispatch(setCart(updated));
            router.push("/checkout");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to initiate checkout";
            toast.error(message);
            setIsBuyingNow(false);
        }
    };

    return (
        <div className="space-y-12 lg:space-y-16">
            {/* Top Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
                <Link href="/" className="hover:text-emerald-700 transition-colors">
                    Home
                </Link>
                <span>/</span>
                <Link href="/products" className="hover:text-emerald-700 transition-colors">
                    Catalog
                </Link>
                {categoryName && (
                    <>
                        <span>/</span>
                        <Link
                            href={`/products?category=${encodeURIComponent(categoryName.toLowerCase())}`}
                            className="hover:text-emerald-700 transition-colors"
                        >
                            {categoryName}
                        </Link>
                    </>
                )}
                <span>/</span>
                <span className="text-zinc-900 truncate max-w-[200px]">{product.title}</span>
            </nav>

            {/* Product Overview Layout: Gallery + Purchasing Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
                {/* Left Column: Gallery */}
                <div className="lg:col-span-6">
                    <ProductGallery images={product.images || []} title={product.title} />
                </div>

                {/* Right Column: Purchasing & Pack Selector */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                {product.brand || "Artisanal Farm Harvest"}
                            </span>

                            {product.averageRating > 0 && (
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                    <span>{product.averageRating.toFixed(1)}</span>
                                    <span className="text-zinc-400">({product.reviewCount} reviews)</span>
                                </div>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                            {product.title}
                        </h1>

                        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                            {product.description || product.shortDescription}
                        </p>
                    </div>

                    {/* Price Block */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                        <div className="flex items-baseline gap-3">
                            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-mono tracking-tight">
                                {formatCurrency(amount, currency, isMinor)}
                            </span>
                            {compareAt && compareAt > amount && (
                                <span className="text-base text-zinc-400 line-through font-mono">
                                    {formatCurrency(compareAt, currency, isMinor)}
                                </span>
                            )}
                            {discountPercentage > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-xs font-bold">
                                    Save {discountPercentage}%
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            Inclusive of all taxes. Free express shipping on orders over ₹499.
                        </p>
                    </div>

                    {/* Pack Size / Variant Selector (Secondary BOM linkage) */}
                    {variants.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                                    Select Pack Size:
                                </label>
                                <span className="text-[11px] font-mono text-zinc-400">
                                    SKU: {selectedVariant.sku || "N/A"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {variants.map((v) => {
                                    const isSelected = v.id === selectedVariant.id;
                                    const vPrice = v.prices?.[0]?.amount ?? 0;
                                    const vIsMinor = vPrice > 1000;

                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setSelectedVariant(v)}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                isSelected
                                                    ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                                                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                                            }`}
                                        >
                                            <div className="font-bold text-xs text-zinc-900 truncate">
                                                {v.title}
                                            </div>
                                            <div className="text-[11px] font-mono font-semibold text-emerald-700 mt-1">
                                                {formatCurrency(vPrice, currency, vIsMinor)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Stock Status & Quantity Stepper */}
                    <div className="space-y-3 pt-2 border-t border-zinc-200">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <ShieldCheck size={15} />
                                <span>In Stock • Dispatched within 24h via FEFO</span>
                            </span>

                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-zinc-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="p-2 hover:bg-zinc-100 text-zinc-600 transition-colors"
                                    aria-label="Decrease quantity"
                                >
                                    <Minus size={13} />
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-zinc-900 font-mono">
                                    {quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                                    className="p-2 hover:bg-zinc-100 text-zinc-600 transition-colors"
                                    aria-label="Increase quantity"
                                >
                                    <Plus size={13} />
                                </button>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isAdding || isBuyingNow}
                                onClick={handleAddToCart}
                                className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                            >
                                {isAdding ? (
                                    <>
                                        <Spinner size="sm" className="text-white" />
                                        <span>Adding to Basket...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag size={16} />
                                        <span>Add to Basket</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                disabled={isAdding || isBuyingNow}
                                onClick={handleBuyNow}
                                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                            >
                                {isBuyingNow ? (
                                    <>
                                        <Spinner size="sm" className="text-white" />
                                        <span>Redirecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} />
                                        <span>Buy Now</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Food Traceability Callout Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 to-zinc-900 text-white space-y-2 border border-emerald-800/40 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                <QrCode size={16} />
                                <span>Batch Birth Certificate Available</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full">
                                100% Transparent
                            </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            Every bottle has a unique batch record. Enter or scan your code to view the farmer harvest lot, extraction timestamp, and lab quality test clearance.
                        </p>
                        <div className="pt-1">
                            <Link
                                href="/verify-batch"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
                            >
                                <span>Lookup Batch Quality Certificate</span>
                                <ArrowRight size={13} />
                            </Link>
                        </div>
                    </div>

                    {/* Shipping & Returns Guarantees */}
                    <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs text-zinc-600">
                        <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
                            <Truck size={18} className="mx-auto text-emerald-600" />
                            <div className="font-semibold text-zinc-900">Fast Dispatch</div>
                            <div className="text-[10px] text-zinc-400">Within 24 Hours</div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
                            <ShieldCheck size={18} className="mx-auto text-emerald-600" />
                            <div className="font-semibold text-zinc-900">Lab Tested</div>
                            <div className="text-[10px] text-zinc-400">Zero Impurities</div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
                            <RotateCcw size={18} className="mx-auto text-emerald-600" />
                            <div className="font-semibold text-zinc-900">Easy Returns</div>
                            <div className="text-[10px] text-zinc-400">Damaged Replacements</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Accordions: Nutritional Facts & Culinary Profile */}
            <div className="space-y-8">
                <ProductNutritionPanel
                    nutritionInfo={product.nutritionInfo}
                    allergens={product.allergens}
                    storageInstructions={product.storageInstructions}
                />

                {/* Customer Reviews Section */}
                <ProductReviewsSection
                    productId={product.id}
                    initialReviews={initialReviews}
                />
            </div>
        </div>
    );
}
