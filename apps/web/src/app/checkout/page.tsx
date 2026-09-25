"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ShieldCheck,
    CreditCard,
    ArrowLeft,
    CheckCircle2,
    Lock,
    ShoppingBag,
    Wallet,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { setCart } from "../../store/cart-slice";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { toast, Spinner } from "@ecommers/ui";
import type { CheckoutAddress } from "@ecommers/types";

export default function CheckoutPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { cart } = useAppSelector((state) => state.cart);
    const { user } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState(user?.email || "");
    const [firstName, setFirstName] = useState(user?.firstName || "");
    const [lastName, setLastName] = useState(user?.lastName || "");
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [phone, setPhone] = useState("");
    const [paymentProvider] = useState<"MOCK" | "STRIPE">("MOCK");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Customer Wallet State
    const [walletBalanceMinor, setWalletBalanceMinor] = useState(0);
    const [useWallet, setUseWallet] = useState(false);

    useEffect(() => {
        if (user && user.role === "CUSTOMER") {
            api.wallet
                .get()
                .then((w) => {
                    setWalletBalanceMinor(w.balanceMinor);
                    if (w.balanceMinor > 0) {
                        setUseWallet(true);
                    }
                })
                .catch(() => {
                    // Wallet not active or unavailable
                });
        }
    }, [user]);

    const items = cart?.items || [];
    const subtotal = cart?.summary?.subtotal || 0;
    const currency = cart?.summary?.currency || "INR";
    const isMinorUnit = subtotal > 1000;
    const effectiveSubtotalPaise = isMinorUnit ? subtotal : subtotal * 100;
    const shippingPaise = effectiveSubtotalPaise >= 49900 ? 0 : 5000;
    const taxPaise = Math.round(effectiveSubtotalPaise * 0.05);
    const grandTotalPaise = effectiveSubtotalPaise + shippingPaise + taxPaise;

    // Split-Payment Calculations
    const walletDeductionPaise = useWallet ? Math.min(walletBalanceMinor, grandTotalPaise) : 0;
    const payableGatewayPaise = grandTotalPaise - walletDeductionPaise;
    const isFullyCoveredByWallet = useWallet && walletDeductionPaise >= grandTotalPaise;

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            toast.error("Your basket is empty");
            return;
        }

        if (!email.trim() || !firstName.trim() || !lastName.trim() || !street.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
            toast.error("Please fill in all required shipping fields");
            return;
        }

        const address: CheckoutAddress = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: "IN",
            phone: phone.trim() || undefined,
        };

        try {
            setIsSubmitting(true);

            // 1. Initiate checkout session & atomic FEFO reservation
            const checkout = await api.checkout.initiate({
                email: email.trim(),
                shippingAddress: address,
                billingAddress: address,
            });

            // 2. Create Payment Intent (with wallet split flag if toggled)
            await api.payments.createIntent({
                checkoutId: checkout.id,
                provider: paymentProvider,
                useWallet: useWallet && walletBalanceMinor > 0,
            });

            // 3. Complete payment webhook if external gateway payment is required
            if (!isFullyCoveredByWallet) {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
                const webhookRes = await fetch(`${apiUrl}/checkout/webhook`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        event: "payment.succeeded",
                        checkoutId: checkout.id,
                    }),
                });

                if (!webhookRes.ok) {
                    throw new Error("Payment completion callback failed");
                }
            }

            // 4. Reset client active cart & redirect to confirmation
            dispatch(setCart(null));
            toast.success(
                isFullyCoveredByWallet
                    ? "Paid with wallet! Order confirmed."
                    : "Order confirmed successfully!"
            );
            router.push(`/orders/${checkout.id}/confirmation`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to place order";
            toast.error(message);
            setIsSubmitting(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="bg-zinc-50 min-h-screen py-16 px-4 flex items-center justify-center">
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-zinc-200 text-center space-y-4 max-w-md w-full shadow-xs">
                    <ShoppingBag size={36} className="mx-auto text-zinc-400" />
                    <h2 className="text-xl font-bold text-zinc-900">Your basket is empty</h2>
                    <p className="text-xs text-zinc-500">
                        Add some fresh harvest items before proceeding to checkout.
                    </p>
                    <Link
                        href="/products"
                        className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                    >
                        Browse Catalog
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/cart"
                            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                                Secure Checkout
                            </h1>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                FEFO Inventory Reservation with Paise-Accurate Minor Economics
                            </p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Lock size={13} />
                        <span>256-Bit Encrypted</span>
                    </div>
                </div>

                <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Form: Shipping & Payment */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* 1. Contact Information */}
                        <div className="p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                    1
                                </span>
                                <h2 className="font-bold text-sm text-zinc-900">Contact Details</h2>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                                />
                                <span className="text-[10px] text-zinc-400 mt-1 block">
                                    Order invoice and harvest batch certificate will be sent here.
                                </span>
                            </div>
                        </div>

                        {/* 2. Shipping Address */}
                        <div className="p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                    2
                                </span>
                                <h2 className="font-bold text-sm text-zinc-900">Delivery Address</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Street Address *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    placeholder="Flat / House No., Apartment, Street"
                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        City *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        State *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        PIN Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={postalCode}
                                        onChange={(e) => setPostalCode(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Phone Number (for Delivery Updates)
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                        </div>

                        {/* 3. Payment Method & Wallet */}
                        <div className="p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                    3
                                </span>
                                <h2 className="font-bold text-sm text-zinc-900">Payment & Wallet</h2>
                            </div>

                            {/* Customer Digital Wallet Split Toggle */}
                            {user && user.role === "CUSTOMER" && walletBalanceMinor > 0 && (
                                <div
                                    className={`p-4 rounded-2xl border transition-all ${
                                        useWallet
                                            ? "border-emerald-500 bg-emerald-50/50 shadow-2xs"
                                            : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50"
                                    }`}
                                >
                                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`p-2 rounded-xl mt-0.5 ${
                                                    useWallet
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-zinc-200 text-zinc-600"
                                                }`}
                                            >
                                                <Wallet size={18} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-900">
                                                        Apply Customer Digital Wallet
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Bal: {formatCurrency(walletBalanceMinor, "INR", true)}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-500">
                                                    {isFullyCoveredByWallet
                                                        ? "Entire order will be paid from wallet balance (instant 1-click checkout)"
                                                        : `${formatCurrency(
                                                              walletDeductionPaise,
                                                              "INR",
                                                              true
                                                          )} from wallet + remaining ${formatCurrency(
                                                              payableGatewayPaise,
                                                              "INR",
                                                              true
                                                          )} charged via gateway`}
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={useWallet}
                                            onChange={(e) => setUseWallet(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 mt-1 cursor-pointer"
                                        />
                                    </label>
                                </div>
                            )}

                            {/* External Gateway Container */}
                            <div
                                className={`p-4 rounded-2xl border-2 transition-all space-y-2 ${
                                    isFullyCoveredByWallet
                                        ? "border-zinc-200 bg-zinc-50/50 opacity-60"
                                        : "border-emerald-600 bg-emerald-50/40"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-xs text-zinc-900">
                                        <CreditCard size={16} className="text-emerald-700" />
                                        <span>
                                            {isFullyCoveredByWallet
                                                ? "Gateway Not Needed (100% Wallet Paid)"
                                                : "Instant Payment Gateway (Sandbox / Card)"}
                                        </span>
                                    </div>
                                    {!isFullyCoveredByWallet && (
                                        <CheckCircle2 size={16} className="text-emerald-600" />
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">
                                    {isFullyCoveredByWallet
                                        ? "No external payment processing required. Order will be settled immediately from your wallet ledger."
                                        : `Authorizes remaining balance of ${formatCurrency(
                                              payableGatewayPaise,
                                              currency,
                                              true
                                          )}.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Summary Sidebar */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="rounded-3xl bg-white border border-zinc-200/80 p-6 space-y-5 shadow-xs sticky top-24">
                            <h2 className="font-extrabold text-base text-zinc-900 border-b border-zinc-100 pb-3">
                                Items in Order ({items.length})
                            </h2>

                            {/* Mini Items Scroll List */}
                            <div className="max-h-64 overflow-y-auto space-y-3 pr-1 divide-y divide-zinc-50">
                                {items.map((item) => (
                                    <div key={item.variantId} className="pt-2 flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                {item.quantity}x
                                            </span>
                                            <span className="truncate font-medium text-zinc-800">
                                                {item.title}
                                            </span>
                                        </div>
                                        <span className="font-bold font-mono text-zinc-900 shrink-0">
                                            {formatCurrency(item.lineTotal, currency, item.priceSnapshot?.amount > 1000)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Financial Summary */}
                            <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
                                <div className="flex justify-between text-zinc-600">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-zinc-900 font-mono">
                                        {formatCurrency(effectiveSubtotalPaise, currency, true)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-zinc-600">
                                    <span>Delivery Fee</span>
                                    <span className="font-bold text-zinc-900 font-mono">
                                        {shippingPaise === 0 ? (
                                            <span className="text-emerald-600">FREE</span>
                                        ) : (
                                            formatCurrency(shippingPaise, currency, true)
                                        )}
                                    </span>
                                </div>

                                <div className="flex justify-between text-zinc-600">
                                    <span>Estimated GST (5%)</span>
                                    <span className="font-bold text-zinc-900 font-mono">
                                        {formatCurrency(taxPaise, currency, true)}
                                    </span>
                                </div>

                                {useWallet && walletDeductionPaise > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-700 font-bold">
                                        <span>Wallet Balance Applied</span>
                                        <span className="font-mono">
                                            - {formatCurrency(walletDeductionPaise, currency, true)}
                                        </span>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                                    <span className="font-extrabold text-sm text-zinc-900">
                                        {useWallet && !isFullyCoveredByWallet
                                            ? "Payable via Gateway"
                                            : "Total Amount"}
                                    </span>
                                    <span className="font-extrabold text-xl text-zinc-900 font-mono">
                                        {formatCurrency(
                                            useWallet ? payableGatewayPaise : grandTotalPaise,
                                            currency,
                                            true
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Place Order CTA */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner size="sm" className="text-white" />
                                            <span>Reserving Stock & Confirming...</span>
                                        </>
                                    ) : isFullyCoveredByWallet ? (
                                        <span>
                                            Pay with Wallet ({formatCurrency(grandTotalPaise, currency, true)})
                                        </span>
                                    ) : useWallet && walletDeductionPaise > 0 ? (
                                        <span>
                                            Pay {formatCurrency(payableGatewayPaise, currency, true)} (Split with Wallet)
                                        </span>
                                    ) : (
                                        <span>
                                            Confirm Order & Pay ({formatCurrency(grandTotalPaise, currency, true)})
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center gap-2 text-xs text-zinc-500">
                                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                                <span>Stock atomically locked. Order dispatches with FEFO lot freshness.</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
