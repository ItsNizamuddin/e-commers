import Link from "next/link";
import { CheckCircle2, ArrowRight, QrCode, PackageCheck } from "lucide-react";
import { api } from "../../../../lib/api";
import { formatCurrency, formatDate } from "../../../../lib/format";
import type { CheckoutResponse } from "@ecommers/types";

interface ConfirmationPageProps {
    params: Promise<{
        id: string;
    }>;
}

export const metadata = {
    title: "Order Confirmed | ECOMMERS",
    description: "Thank you for your farm-to-fork order. Your harvest reservation has been secured.",
};

export default async function OrderConfirmationPage({ params }: ConfirmationPageProps) {
    const { id } = await params;

    let checkout: CheckoutResponse | null = null;
    try {
        checkout = await api.checkout.getById(id);
    } catch {
        checkout = null;
    }

    const items = checkout?.items || [];
    const address = checkout?.shippingAddressSnapshot;
    const pricing = checkout?.pricing;
    const currency = checkout?.currency || "INR";

    return (
        <div className="bg-zinc-50 min-h-screen py-12 lg:py-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Success Card Header */}
                <div className="rounded-3xl bg-white border border-zinc-200/80 p-8 sm:p-10 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={36} className="stroke-[2.5]" />
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                            Reservation Secured
                        </span>
                        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight pt-2">
                            Order Confirmed!
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">
                            Thank you for supporting pure, chemical-free food. Your items are being prepared for dispatch according to strict FEFO lot freshness standards.
                        </p>
                    </div>

                    {/* Reference Box */}
                    <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-6 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs">
                        <div>
                            <span className="text-zinc-400">Order Reference:</span>{" "}
                            <strong className="font-mono text-zinc-900">{id}</strong>
                        </div>
                        <span className="hidden sm:inline text-zinc-300">•</span>
                        <div>
                            <span className="text-zinc-400">Date:</span>{" "}
                            <strong className="text-zinc-900">{formatDate(checkout?.createdAt || new Date())}</strong>
                        </div>
                    </div>
                </div>

                {/* Fulfillment Guarantee Timeline */}
                <div className="rounded-3xl bg-emerald-950 text-white p-6 sm:p-8 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <PackageCheck size={16} />
                        <span>FEFO Lot Fulfillment Schedule</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                        <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-800/40 space-y-1">
                            <span className="text-emerald-400 font-bold block text-[11px]">Stage 1: Verified</span>
                            <p className="text-emerald-100/90 text-xs">Stock locked from active harvest storage</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-800/40 space-y-1">
                            <span className="text-emerald-400 font-bold block text-[11px]">Stage 2: Packaged</span>
                            <p className="text-emerald-100/90 text-xs">Sealed with batch QR certificate</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-900/40 border border-emerald-800/40 space-y-1">
                            <span className="text-emerald-400 font-bold block text-[11px]">Stage 3: Dispatched</span>
                            <p className="text-emerald-100/90 text-xs">Dispatches within 24h via Express</p>
                        </div>
                    </div>
                </div>

                {/* Order Details Breakdown */}
                <div className="rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
                    <h2 className="font-extrabold text-base text-zinc-900 border-b border-zinc-100 pb-3">
                        Itemized Harvest Receipt
                    </h2>

                    {/* Items List */}
                    <div className="space-y-4 divide-y divide-zinc-100">
                        {items.map((item) => (
                            <div key={item.variantId} className="pt-3 flex items-center justify-between text-xs gap-4">
                                <div className="space-y-1">
                                    <div className="font-bold text-zinc-900">
                                        {item.quantity}x {item.productTitle} <span className="font-normal text-zinc-500">({item.variantTitle})</span>
                                    </div>
                                    <div className="text-[11px] font-mono text-zinc-400">
                                        SKU: {item.sku}
                                    </div>
                                    <Link
                                        href="/verify-batch"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                                    >
                                        <QrCode size={11} />
                                        <span>Verify Harvest Lot Origin →</span>
                                    </Link>
                                </div>

                                <div className="text-right font-mono font-bold text-sm text-zinc-900">
                                    {formatCurrency(item.lineTotalMinor, currency, true)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Financial Summary */}
                    {pricing && (
                        <div className="pt-4 border-t border-zinc-200 space-y-2 text-xs">
                            <div className="flex justify-between text-zinc-600">
                                <span>Subtotal</span>
                                <span className="font-mono font-bold text-zinc-900">
                                    {formatCurrency(pricing.subtotalMinor, currency, true)}
                                </span>
                            </div>
                            <div className="flex justify-between text-zinc-600">
                                <span>Shipping Fee</span>
                                <span className="font-mono font-bold text-zinc-900">
                                    {pricing.shippingMinor === 0 ? "FREE" : formatCurrency(pricing.shippingMinor, currency, true)}
                                </span>
                            </div>
                            <div className="flex justify-between text-zinc-600">
                                <span>GST / Taxes</span>
                                <span className="font-mono font-bold text-zinc-900">
                                    {formatCurrency(pricing.taxMinor, currency, true)}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-zinc-100 flex justify-between items-baseline">
                                <span className="font-extrabold text-sm text-zinc-900">Total Paid</span>
                                <span className="font-extrabold text-lg text-zinc-900 font-mono">
                                    {formatCurrency(pricing.grandTotalMinor, currency, true)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Shipping Address Summary */}
                    {address && (
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1 text-xs">
                            <span className="font-bold text-zinc-900 block text-[11px] uppercase tracking-wider">
                                Shipping Destination:
                            </span>
                            <p className="text-zinc-700">
                                {address.firstName} {address.lastName}
                            </p>
                            <p className="text-zinc-600">
                                {address.street}, {address.city}, {address.state} - {address.postalCode}
                            </p>
                            {address.phone && (
                                <p className="text-zinc-500 font-mono">Phone: {address.phone}</p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        <Link
                            href="/products"
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                            <span>Explore More Harvest Foods</span>
                            <ArrowRight size={14} />
                        </Link>
                        <Link
                            href="/verify-batch"
                            className="py-3 px-4 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <QrCode size={14} className="text-emerald-600" />
                            <span>Batch Verification Portal</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
