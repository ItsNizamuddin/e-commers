"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Star, QrCode } from "lucide-react";
import type { ProductResponse, ProductVariantResponse } from "@ecommers/types";
import { formatCurrency } from "../../lib/format";
import { api } from "../../lib/api";
import { useAppDispatch } from "../../store";
import { setCart, setCartOpen } from "../../store/cart-slice";
import { toast, Spinner } from "@ecommers/ui";

export interface ProductCardProps {
    product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
    const dispatch = useAppDispatch();
    const variants = product.variants || [];
    const [selectedVariant, setSelectedVariant] = useState<ProductVariantResponse>(
        variants[0] || ({} as ProductVariantResponse)
    );
    const [isAdding, setIsAdding] = useState(false);

    const priceObj = selectedVariant.prices?.[0];
    const amount = priceObj?.amount ?? 0;
    const currency = priceObj?.currency || product.baseCurrency || "INR";
    const compareAt = priceObj?.compareAtAmount;
    const isMinor = amount > 1000;

    const discountPercentage =
        compareAt && compareAt > amount
            ? Math.round(((compareAt - amount) / compareAt) * 100)
            : 0;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedVariant.id) {
            toast.error("Variant unavailable");
            return;
        }

        try {
            setIsAdding(true);
            const updatedCart = await api.cart.addItem({
                productId: product.id,
                variantId: selectedVariant.id,
                quantity: 1,
                currency,
            });

            dispatch(setCart(updatedCart));
            dispatch(setCartOpen(true));
            toast.success(`${product.title} added to your basket!`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to add item to basket";
            toast.error(message);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="group relative rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div>
                {/* Image & Badges Container */}
                <Link
                    href={`/products/${product.slug}`}
                    className="block relative aspect-square bg-zinc-100 overflow-hidden cursor-pointer"
                >
                    {product.thumbnail || product.images?.[0] ? (
                        <Image
                            src={product.thumbnail || product.images[0]}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                            <ShoppingBag size={32} />
                            <span className="text-[11px] font-mono">Artisanal Food</span>
                        </div>
                    )}

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-emerald-800 shadow-2xs border border-emerald-100">
                            <QrCode size={11} /> Traceable
                        </span>

                        {discountPercentage > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-xs">
                                {discountPercentage}% OFF
                            </span>
                        )}
                    </div>
                </Link>

                {/* Content Details */}
                <div className="p-4 space-y-2.5">
                    {/* Rating & Brand */}
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="font-medium text-emerald-700 text-[11px] uppercase tracking-wider">
                            {product.brand || "Farm Collective"}
                        </span>

                        {product.averageRating > 0 ? (
                            <div className="flex items-center gap-1 font-semibold text-zinc-700">
                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                <span>{product.averageRating.toFixed(1)}</span>
                                <span className="text-zinc-400 text-[10px]">({product.reviewCount})</span>
                            </div>
                        ) : (
                            <span className="text-[10px] text-zinc-400">Fresh Harvest</span>
                        )}
                    </div>

                    {/* Title */}
                    <Link href={`/products/${product.slug}`} className="block group-hover:text-emerald-700 transition-colors">
                        <h3 className="font-bold text-sm text-zinc-900 line-clamp-1 leading-snug">
                            {product.title}
                        </h3>
                    </Link>

                    {/* Description excerpt */}
                    {product.shortDescription || product.description ? (
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                            {product.shortDescription || product.description}
                        </p>
                    ) : null}

                    {/* Pack Size / Variant Selector Pills */}
                    {variants.length > 1 && (
                        <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
                                Size:
                            </span>
                            {variants.map((v) => {
                                const isSelected = v.id === selectedVariant.id;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => setSelectedVariant(v)}
                                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                                            isSelected
                                                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                                                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                                        }`}
                                    >
                                        {v.title}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Price & Action Button Footer */}
            <div className="p-4 pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 mt-auto">
                <div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-zinc-900 font-mono tracking-tight">
                            {formatCurrency(amount, currency, isMinor)}
                        </span>
                        {compareAt && compareAt > amount && (
                            <span className="text-xs text-zinc-400 line-through font-mono">
                                {formatCurrency(compareAt, currency, isMinor)}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-zinc-400">Incl. all taxes</span>
                </div>

                <button
                    type="button"
                    disabled={isAdding}
                    onClick={handleAddToCart}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
                >
                    {isAdding ? (
                        <>
                            <Spinner size="sm" className="text-white" />
                            <span>Adding</span>
                        </>
                    ) : (
                        <>
                            <ShoppingBag size={14} />
                            <span>Add</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
