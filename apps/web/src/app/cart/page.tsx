"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ShoppingBag,
    Plus,
    Minus,
    Trash2,
    ArrowRight,
    ShieldCheck,
    Truck,
    ArrowLeft,
    Sparkles,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { setCart } from "../../store/cart-slice";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { toast } from "@ecommers/ui";

const FREE_SHIPPING_THRESHOLD_PAISE = 49900; // ₹499 in minor units

export default function CartPage() {
    const dispatch = useAppDispatch();
    const { cart } = useAppSelector((state) => state.cart);
    const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

    const items = cart?.items || [];
    const subtotal = cart?.summary?.subtotal || 0;
    const currency = cart?.summary?.currency || "INR";
    const itemCount = cart?.summary?.itemCount || 0;

    const isMinorUnit = subtotal > 1000;
    const effectiveSubtotalPaise = isMinorUnit ? subtotal : subtotal * 100;
    const progressPercent = Math.min(100, Math.round((effectiveSubtotalPaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100));
    const amountRemainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - effectiveSubtotalPaise);
    const isFreeShipping = amountRemainingForFreeShipping === 0;

    const estimatedShipping = isFreeShipping || items.length === 0 ? 0 : 5000; // ₹50.00
    const estimatedTax = Math.round(effectiveSubtotalPaise * 0.05); // 5% GST
    const estimatedTotal = effectiveSubtotalPaise + estimatedShipping + estimatedTax;

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update item quantity";
            toast.error(message);
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
            toast.success("Item removed from your basket");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to remove item";
            toast.error(message);
        } finally {
            setUpdatingVariantId(null);
        }
    };

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Link href="/" className="hover:underline flex items-center gap-1">
                        <ArrowLeft size={13} /> Home
                    </Link>
                    <span>/</span>
                    <span className="text-zinc-600">Shopping Basket</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
                    <div>
                        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                            Your Farm Basket
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                            Review your fresh harvest selections before secure checkout.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span>FEFO Lot Freshness Guaranteed</span>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-zinc-200 p-12 lg:p-16 text-center space-y-4 shadow-xs max-w-xl mx-auto">
                        <div className="w-18 h-18 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                            <ShoppingBag size={36} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-extrabold text-lg text-zinc-900">Your basket is empty</h2>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                                Explore single-origin cold-pressed oils, stone-ground heirloom flours, and raw preserves.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                            >
                                <span>Browse Catalog</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Cart Items List */}
                        <div className="lg:col-span-8 space-y-4">
                            {/* Free Shipping Tracker */}
                            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    {isFreeShipping ? (
                                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                                            <Truck size={15} className="text-emerald-600" />
                                            🎉 You have unlocked Free Express Shipping!
                                        </span>
                                    ) : (
                                        <span className="text-zinc-700">
                                            Add <strong className="text-emerald-700 font-bold">{formatCurrency(amountRemainingForFreeShipping, currency, true)}</strong> more to unlock Free Express Delivery
                                        </span>
                                    )}
                                    <span className="font-mono font-bold text-emerald-700">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Item Rows */}
                            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs divide-y divide-zinc-100 overflow-hidden">
                                {items.map((item) => {
                                    const isUpdating = updatingVariantId === item.variantId;
                                    const itemPrice = item.priceSnapshot?.amount || 0;
                                    const isItemMinor = itemPrice > 1000;

                                    return (
                                        <div
                                            key={item.variantId}
                                            className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-zinc-50/50 transition-colors"
                                        >
                                            <div className="flex gap-4 items-center min-w-0">
                                                <div className="w-18 h-18 rounded-xl bg-zinc-100 relative overflow-hidden shrink-0 border border-zinc-200">
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

                                                <div className="space-y-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-zinc-900 truncate">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500 font-mono">
                                                        SKU: {item.sku}
                                                    </p>
                                                    <p className="text-xs font-semibold text-emerald-700 font-mono">
                                                        {formatCurrency(itemPrice, currency, isItemMinor)} each
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quantity and Line Total */}
                                            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100">
                                                {/* Quantity Stepper */}
                                                <div className="flex items-center border border-zinc-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity, -1)}
                                                        className="p-2 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50 transition-colors"
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={13} />
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-bold text-zinc-900 font-mono">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() => handleUpdateQuantity(item.variantId, item.quantity, 1)}
                                                        className="p-2 hover:bg-zinc-100 text-zinc-600 disabled:opacity-50 transition-colors"
                                                        aria-label="Increase quantity"
                                                    >
                                                        <Plus size={13} />
                                                    </button>
                                                </div>

                                                <div className="text-right min-w-[80px]">
                                                    <div className="font-bold text-sm text-zinc-900 font-mono">
                                                        {formatCurrency(item.lineTotal, currency, isItemMinor)}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={isUpdating}
                                                    onClick={() => handleRemoveItem(item.variantId)}
                                                    className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
                                <Link
                                    href="/products"
                                    className="font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
                                >
                                    <ArrowLeft size={13} />
                                    <span>Continue Shopping</span>
                                </Link>

                                <span>{itemCount} {itemCount === 1 ? "item" : "items"} in basket</span>
                            </div>
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="lg:col-span-4">
                            <div className="rounded-3xl bg-white border border-zinc-200/80 p-6 space-y-6 shadow-xs sticky top-24">
                                <h2 className="font-extrabold text-base text-zinc-900 border-b border-zinc-100 pb-3">
                                    Order Summary
                                </h2>

                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between text-zinc-600">
                                        <span>Subtotal</span>
                                        <span className="font-bold text-zinc-900 font-mono">
                                            {formatCurrency(effectiveSubtotalPaise, currency, true)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-zinc-600">
                                        <span>Estimated Delivery</span>
                                        <span className="font-bold text-zinc-900 font-mono">
                                            {isFreeShipping ? (
                                                <span className="text-emerald-600">FREE</span>
                                            ) : (
                                                formatCurrency(estimatedShipping, currency, true)
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-zinc-600">
                                        <span>Estimated GST (5%)</span>
                                        <span className="font-bold text-zinc-900 font-mono">
                                            {formatCurrency(estimatedTax, currency, true)}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-zinc-100 flex justify-between items-baseline">
                                        <span className="font-extrabold text-sm text-zinc-900">Total Payable</span>
                                        <span className="font-extrabold text-lg text-zinc-900 font-mono">
                                            {formatCurrency(estimatedTotal, currency, true)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        Paise-accurate integer minor units. Inventory locked upon checkout initiation.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <Link
                                        href="/checkout"
                                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                                    >
                                        <span>Proceed to Checkout</span>
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-2 text-xs text-zinc-600">
                                    <div className="flex items-center gap-2 font-semibold text-zinc-800">
                                        <ShieldCheck size={16} className="text-emerald-600" />
                                        <span>Guaranteed Safe Delivery</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                                        Carefully packed in food-grade eco-packaging with temperature stability.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
