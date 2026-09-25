"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Package,
    QrCode,
    LogOut,
    ShieldCheck,
    ArrowRight,
    ShoppingBag,
    Wallet,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { clearSession } from "../../store/auth-slice";
import { api, setAccessToken } from "../../lib/api";
import { toast } from "@ecommers/ui";

export default function AccountPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (isHydrated && !isAuthenticated) {
            router.push("/login");
        }
    }, [isHydrated, isAuthenticated, router]);

    const handleLogout = async () => {
        try {
            await api.auth.logout();
        } catch {
            // Ignore error
        } finally {
            setAccessToken(null);
            dispatch(clearSession());
            toast.success("Signed out successfully");
            router.push("/login");
        }
    };

    if (!user) {
        return (
            <div className="bg-zinc-50 min-h-screen py-20 text-center text-xs text-zinc-500">
                Loading account...
            </div>
        );
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header Card */}
                <div className="rounded-3xl bg-white border border-zinc-200/80 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs">
                            {user.firstName?.charAt(0) || "U"}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                                    {user.firstName} {user.lastName}
                                </h1>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                    ACTIVE CUSTOMER
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium">{user.email}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 hover:border-rose-200 text-xs font-semibold text-zinc-700 hover:text-rose-600 hover:bg-rose-50 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
                </div>

                {/* Dashboard Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Wallet Card */}
                    <Link
                        href="/account/wallet"
                        className="group rounded-3xl bg-white border border-zinc-200/80 p-6 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Wallet size={22} />
                            </div>
                            <h2 className="text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                Digital Wallet
                            </h2>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Manage your stored balance, add top-up funds, and view immutable transaction ledger records.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                            <span>Open Wallet</span>
                            <ArrowRight size={14} />
                        </div>
                    </Link>

                    {/* Orders Card */}
                    <Link
                        href="/account/orders"
                        className="group rounded-3xl bg-white border border-zinc-200/80 p-6 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Package size={22} />
                            </div>
                            <h2 className="text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                Order History & Invoices
                            </h2>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Track dispatch timeline, download invoices, and inspect allocated FEFO harvest lots.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                            <span>View All Orders</span>
                            <ArrowRight size={14} />
                        </div>
                    </Link>

                    {/* Batch Verification Portal */}
                    <Link
                        href="/verify-batch"
                        className="group rounded-3xl bg-white border border-zinc-200/80 p-6 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div className="space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <QrCode size={22} />
                            </div>
                            <h2 className="text-base font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                Food Batch Verification
                            </h2>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Enter your jar code to view farm harvest origin, extraction methods, and lab purity tests.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-zinc-100 mt-6 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                            <span>Verify Any Batch</span>
                            <ArrowRight size={14} />
                        </div>
                    </Link>
                </div>

                {/* Farm Quality Commitment Box */}
                <div className="rounded-3xl bg-zinc-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <ShieldCheck size={16} />
                            <span>100% Chemical-Free Promise</span>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Looking to replenish your pantry with cold-pressed oils or stone-ground flour?
                        </p>
                    </div>

                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
                    >
                        <ShoppingBag size={14} />
                        <span>Explore Catalog</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
