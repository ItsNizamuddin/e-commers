"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { setCartOpen, setCart } from "../../store/cart-slice";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

const FREE_SHIPPING_THRESHOLD_PAISE = 49900; // ₹499 in minor units

export function CartDrawer() {
    const dispatch = useAppDispatch();
    const { isCartOpen, cart } = useAppSelector((state) => state.cart);
    const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

    if (!isCartOpen) return null;

    const items = cart?.items || [];
    const subtotal = cart?.summary?.subtotal || 0;
    const currency = cart?.summary?.currency || "INR";
    const itemCount = cart?.summary?.itemCount || 0;

    // Check if subtotal is stored in minor-units (e.g. > 1000 for ₹500)
    // The backend provides subtotal in standard currency or paise. We format it gracefully.
    const isMinorUnit = subtotal > 1000;
    const effectiveSubtotalPaise = isMinorUnit ? subtotal : subtotal * 100;
    const progressPercent = Math.min(100, Math.round((effectiveSubtotalPaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100));
    const amountRemainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - effectiveSubtotalPaise);

    const handleUpdateQuantity = async (variantId: string, currentQty: number, delta: number) => {
        if (!cart) return;
        const newQty = currentQty + delta;
        if (newQty <= 0) {
            handleRemoveItem(variantId);
            return;
        }

        try {
            setUpdatingVariantId(variantId);
            const updated = await api.cart.updateQuantity(variantId, newQty, cart.version);
            dispatch(setCart(updated));
        } catch (error) {
            console.error("Failed to update cart quantity:", error);
        } finally {
            setUpdatingVariantId(null);
        }
    };

    const handleRemoveItem = async (variantId: string) => {
        if (!cart) return;
        try {
            setUpdatingVariantId(variantId);
            const updated = await api.cart.removeItem(variantId, cart.version);
            dispatch(setCart(updated));
        } catch (error) {
            console.error("Failed to remove cart item:", error);
        } finally {
            setUpdatingVariantId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={() => dispatch(setCartOpen(false))}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag size={20} className="text-zinc-800" />
                            <h2 className="font-bold text-base text-zinc-900">Your Basket</h2>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                            </span>
                        </div>
                        <button
                            onClick={() => dispatch(setCartOpen(false))}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            aria-label="Close cart"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Free Shipping Progress Indicator */}
                    <div className="bg-emerald-50/70 border-b border-emerald-100 p-3 sm:px-5">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            {amountRemainingForFreeShipping === 0 ? (
                                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                    🎉 Free Express Shipping Unlocked!
                                </span>
                            ) : (
                                <span className="text-zinc-700">
                                    Add <strong className="text-emerald-700 font-semibold">{formatCurrency(amountRemainingForFreeShipping, currency, true)}</strong> more for free delivery
                                </span>
                            )}
                            <span className="font-bold text-emerald-700">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Item List / Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-500 space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                                    <ShoppingBag size={32} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-zinc-800">Your basket is empty</h3>
                                    <p className="text-xs text-zinc-500 max-w-xs mt-1">
                                        Discover fresh artisanal cold-pressed oils, organic flours, and pure preserves.
                                    </p>
                                </div>
                                <Link
                                    href="/products"
                                    onClick={() => dispatch(setCartOpen(false))}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                                >
                                    <span>Browse Fresh Catalog</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        ) : (
                            items.map((item) => {
                                const isUpdating = updatingVariantId === item.variantId;
                                const itemPrice = item.priceSnapshot?.amount || 0;
                                const isItemMinor = itemPrice > 1000;

                                return (
                                    <div
                                        key={item.variantId}
                                        className="flex gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-zinc-200 transition-all"
                                    >
                                        {/* Product Thumbnail */}
                                        <div className="w-18 h-18 rounded-lg bg-zinc-100 relative overflow-hidden shrink-0 border border-zinc-200/60">
                                            {item.thumbnail ? (
                                                <Image
                                                    src={item.thumbnail}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                                    <ShoppingBag size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-xs font-semibold text-zinc-900 truncate">
                                                    {item.title}
                                                </h4>
                                                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                                    SKU: {item.sku}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                                                {/* Quantity Stepper */}
                                                <div className="flex items-center border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity, -1)}
                                                        className="p-1 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50 transition-colors"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="w-7 text-center text-xs font-semibold text-zinc-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity, 1)}
                                                        className="p-1 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50 transition-colors"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>

                                                {/* Price & Delete */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-900 font-mono">
                                                        {formatCurrency(item.lineTotal, currency, isItemMinor)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleRemoveItem(item.variantId)}
                                                        className="text-zinc-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer / Checkout Button */}
                    {items.length > 0 && (
                        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50/50 space-y-3">
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-zinc-600">
                                    <span>Subtotal</span>
                                    <span className="font-semibold text-zinc-900 font-mono">
                                        {formatCurrency(subtotal, currency, isMinorUnit)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                                    <span>Taxes & Shipping</span>
                                    <span>Calculated at checkout</span>
                                </div>
                            </div>

                            <div className="pt-1 flex flex-col gap-2">
                                <Link
                                    href="/checkout"
                                    onClick={() => dispatch(setCartOpen(false))}
                                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                                >
                                    <span>Proceed to Checkout</span>
                                    <ArrowRight size={16} />
                                </Link>

                                <Link
                                    href="/cart"
                                    onClick={() => dispatch(setCartOpen(false))}
                                    className="w-full py-2 text-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                                >
                                    View Full Cart Details
                                </Link>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-1">
                                <ShieldCheck size={14} className="text-emerald-600" />
                                <span>Atomic Inventory Lock • Safe FEFO Dispatch</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
