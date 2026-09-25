"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    RefreshCw,
    ShieldCheck,
    History,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    X,
} from "lucide-react";
import { useAppSelector } from "../../../store";
import { api } from "../../../lib/api";
import { formatCurrency, formatDate } from "../../../lib/format";
import { toast, Spinner } from "@ecommers/ui";
import type { WalletResponse, WalletTransactionResponse } from "@ecommers/types";

const TOPUP_PRESETS = [200, 500, 1000, 2000];

export default function CustomerWalletPage() {
    const router = useRouter();
    const { user, isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

    const [wallet, setWallet] = useState<WalletResponse | null>(null);
    const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [typeFilter, setTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Top up modal states
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState<number>(500);
    const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

    const loadWalletData = useCallback(async () => {
        try {
            const walletData = await api.wallet.get();
            setWallet(walletData);

            const txData = await api.wallet.getTransactions({
                page,
                limit: 10,
                ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
            });
            setTransactions(txData.items);
            setTotalPages(txData.pages || 1);
        } catch (error: any) {
            toast.error(error?.message || "Failed to load wallet data");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, typeFilter]);

    useEffect(() => {
        if (isHydrated) {
            if (!isAuthenticated) {
                router.push("/login");
                return;
            }
            if (user && user.role !== "CUSTOMER") {
                toast.error("Customer digital wallet is only available for customer accounts");
                router.push("/account");
                return;
            }
            void loadWalletData();
        }
    }, [isHydrated, isAuthenticated, user, router, loadWalletData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadWalletData();
    };

    const handleInitiateTopUp = async () => {
        if (!topUpAmount || topUpAmount < 10) {
            toast.error("Minimum top-up amount is ₹10");
            return;
        }

        try {
            setIsSubmittingTopUp(true);
            const amountMinor = Math.round(topUpAmount * 100);

            const intent = await api.wallet.createTopUpIntent({
                amountMinor,
                provider: "MOCK",
            });

            toast.success("Top-up payment intent created!");
            setShowTopUpModal(false);
            await handleRefresh();
        } catch (error: any) {
            toast.error(error?.message || "Failed to initiate top-up");
        } finally {
            setIsSubmittingTopUp(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-50 min-h-screen py-24 flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" className="text-emerald-600" />
                <p className="text-xs text-zinc-500 font-medium tracking-wide">
                    Loading your customer digital ledger...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-50 min-h-screen py-8 lg:py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Back Breadcrumb */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/account"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        <span>Back to Account</span>
                    </Link>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                        <span>Refresh Balance</span>
                    </button>
                </div>

                {/* Primary Balance Hero Card */}
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-900 via-zinc-900 to-zinc-950 text-white p-6 sm:p-10 shadow-lg border border-emerald-800/40">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold tracking-wider uppercase">
                                <ShieldCheck size={14} />
                                <span>Customer Ledger • {wallet?.currency || "INR"}</span>
                            </div>

                            <div>
                                <span className="text-xs text-zinc-400 font-medium block mb-1">
                                    Available Wallet Balance
                                </span>
                                <div className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-baseline gap-2">
                                    {formatCurrency(wallet?.balanceMinor, wallet?.currency, true)}
                                </div>
                            </div>

                            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                                Use your stored balance for seamless 1-click checkout, instant split-payments,
                                and instant refunds.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => setShowTopUpModal(true)}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <Plus size={16} className="stroke-[3]" />
                                <span>Add Funds</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fast Top-Up Presets Banner */}
                <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                                Quick Wallet Top-Up
                            </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">Zero transaction fees</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {TOPUP_PRESETS.map((amount) => (
                            <button
                                key={amount}
                                onClick={() => {
                                    setTopUpAmount(amount);
                                    setShowTopUpModal(true);
                                }}
                                className="py-3 px-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-zinc-800 font-bold text-sm transition-all text-center cursor-pointer shadow-2xs hover:shadow-xs"
                            >
                                + ₹{amount}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ledger Transactions Table Section */}
                <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-2xs overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-zinc-500" />
                                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                                    Passbook & Ledger Records
                                </h2>
                            </div>
                            <p className="text-xs text-zinc-500">
                                Immutable, auditable accounting records of every wallet credit and debit.
                            </p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold">
                            {(["ALL", "CREDIT", "DEBIT"] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => {
                                        setTypeFilter(filter);
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        typeFilter === filter
                                            ? "bg-white text-zinc-900 shadow-2xs"
                                            : "text-zinc-600 hover:text-zinc-900"
                                    }`}
                                >
                                    {filter === "ALL" ? "All Activity" : filter === "CREDIT" ? "Credits" : "Debits"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table / List */}
                    {transactions.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <Wallet size={36} className="mx-auto text-zinc-300" />
                            <p className="text-xs font-medium text-zinc-500">No transactions recorded yet.</p>
                            <p className="text-[11px] text-zinc-400">
                                Your balance top-ups and checkout payments will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100">
                            {transactions.map((tx) => {
                                const isCredit = tx.type === "CREDIT";
                                return (
                                    <div
                                        key={tx.id}
                                        className="p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/70 transition-colors gap-4"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div
                                                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                                                    isCredit
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                        : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                                                }`}
                                            >
                                                {isCredit ? (
                                                    <ArrowDownLeft size={18} className="stroke-[2.5]" />
                                                ) : (
                                                    <ArrowUpRight size={18} className="stroke-[2.5]" />
                                                )}
                                            </div>

                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-900">
                                                        {tx.purpose.replace(/_/g, " ")}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-zinc-400">
                                                        {tx.transactionId}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                                    <span>{formatDate(tx.createdAt)}</span>
                                                    <span>•</span>
                                                    <span>Ref: {tx.referenceType}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right space-y-0.5">
                                            <div
                                                className={`text-sm font-bold tracking-tight ${
                                                    isCredit ? "text-emerald-700" : "text-zinc-900"
                                                }`}
                                            >
                                                {isCredit ? "+" : "-"}
                                                {formatCurrency(tx.amountMinor, "INR", true)}
                                            </div>
                                            <div className="text-[11px] text-zinc-400 font-medium">
                                                Bal: {formatCurrency(tx.balanceAfterMinor, "INR", true)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Up Modal */}
            {showTopUpModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-xl space-y-6 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                                    <Plus size={20} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900">Add Funds to Wallet</h3>
                                    <p className="text-[11px] text-zinc-500">100% safe & protected ledger</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTopUpModal(false)}
                                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                    Select Preset Amount
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {TOPUP_PRESETS.map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTopUpAmount(amt)}
                                            className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                topUpAmount === amt
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                                            }`}
                                        >
                                            ₹{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                    Or Enter Custom Amount (₹)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-2.5 text-zinc-400 font-bold text-xs">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        min="10"
                                        max="50000"
                                        value={topUpAmount || ""}
                                        onChange={(e) => setTopUpAmount(Number(e.target.value))}
                                        placeholder="500"
                                        className="w-full pl-8 pr-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <span className="text-[10px] text-zinc-400 mt-1 block">
                                    Min: ₹10.00 • Max: ₹50,000.00
                                </span>
                            </div>

                            <div className="rounded-2xl bg-zinc-50 p-3.5 border border-zinc-100 flex items-center justify-between text-xs">
                                <span className="text-zinc-500 font-medium">New Total Balance</span>
                                <span className="font-extrabold text-zinc-900">
                                    {formatCurrency((wallet?.balanceMinor || 0) + topUpAmount * 100, "INR", true)}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleInitiateTopUp}
                                disabled={isSubmittingTopUp || topUpAmount < 10}
                                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmittingTopUp ? (
                                    <>
                                        <Spinner size="sm" className="text-white" />
                                        <span>Confirming Top-Up...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>Proceed to Add ₹{topUpAmount}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
