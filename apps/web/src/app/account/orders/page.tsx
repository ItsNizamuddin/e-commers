"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Package,
    ArrowLeft,
    QrCode,
    Calendar,
    ShoppingBag,
    ArrowRight,
    Clock,
} from "lucide-react";
import { useAppSelector } from "../../../store";
import { api } from "../../../lib/api";
import { formatCurrency, formatDate } from "../../../lib/format";
import type { OrderResponse } from "@ecommers/types";
import { Spinner } from "@ecommers/ui";

export default function CustomerOrdersPage() {
    const router = useRouter();
    const { isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push("/login");
            return;
        }

        async function fetchOrders() {
            try {
                const res = await api.orders.myOrders({ limit: 20 });
                setOrders(res?.items || []);
            } catch {
                setOrders([]);
            } finally {
                setIsLoading(false);
            }
        }

        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isHydrated, isAuthenticated, router]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "DELIVERED":
                return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "SHIPPED":
                return "bg-sky-100 text-sky-800 border-sky-200";
            case "PACKED":
            case "PROCESSING":
                return "bg-amber-100 text-amber-800 border-amber-200";
            case "CANCELLED":
                return "bg-rose-100 text-rose-800 border-rose-200";
            default:
                return "bg-zinc-100 text-zinc-800 border-zinc-200";
        }
    };

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <Link href="/account" className="hover:underline flex items-center gap-1">
                        <ArrowLeft size={13} /> Account
                    </Link>
                    <span>/</span>
                    <span className="text-zinc-600">Order History</span>
                </div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
                            My Farm Harvest Orders
                        </h1>
                        <p className="text-xs text-zinc-500 mt-1">
                            Track dispatch status, invoices, and agricultural lot allocations.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Clock size={13} className="text-emerald-600" />
                        <span>FEFO Lot Tracking Enabled</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <Spinner size="md" />
                        <span className="text-xs font-medium">Retrieving your orders...</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-zinc-200 p-12 text-center space-y-4 shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                            <Package size={32} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-bold text-base text-zinc-900">No orders placed yet</h2>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                                Once you place an order, your tracking timeline and batch verification records will appear here.
                            </p>
                        </div>
                        <div className="pt-2">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                            >
                                <ShoppingBag size={14} />
                                <span>Start Shopping</span>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const pricing = order.pricing;
                            const currency = pricing?.currency || "INR";
                            const items = order.items || [];

                            return (
                                <div
                                    key={order.id}
                                    className="rounded-3xl bg-white border border-zinc-200/80 p-6 space-y-4 shadow-xs hover:border-zinc-300 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-zinc-900 font-mono">
                                                    Order #{order.orderNumber || order.id}
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                                                        order.orderStatus
                                                    )}`}
                                                >
                                                    {order.orderStatus}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                <Calendar size={12} />
                                                <span>Placed on {formatDate(order.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-xs text-zinc-400 block font-medium">Total Paid</span>
                                            <span className="text-base font-extrabold text-zinc-900 font-mono">
                                                {formatCurrency(pricing?.grandTotalMinor || 0, currency, true)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-2 text-xs">
                                        {items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-zinc-700"
                                            >
                                                <span className="font-medium">
                                                    {item.quantity}x {item.productTitle} ({item.variantTitle})
                                                </span>
                                                <span className="font-mono text-zinc-500">
                                                    {formatCurrency(item.lineTotalMinor, currency, true)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                                        <Link
                                            href="/verify-batch"
                                            className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                                        >
                                            <QrCode size={13} />
                                            <span>Verify Item Batch Lots</span>
                                        </Link>

                                        <Link
                                            href={`/orders/${order.id}/confirmation`}
                                            className="inline-flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-900 transition-colors"
                                        >
                                            <span>View Receipt</span>
                                            <ArrowRight size={13} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
