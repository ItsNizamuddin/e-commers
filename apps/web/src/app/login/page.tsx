"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Leaf, ShieldCheck } from "lucide-react";
import { api, setAccessToken } from "../../lib/api";
import { useAppDispatch } from "../../store";
import { setSession } from "../../store/auth-slice";
import { setCart } from "../../store/cart-slice";
import { toast, Spinner } from "@ecommers/ui";

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            toast.error("Please enter your email and password");
            return;
        }

        try {
            setIsLoading(true);
            const res = await api.auth.login({
                email: email.trim(),
                password: password.trim(),
            });

            setAccessToken(res.accessToken);
            dispatch(setSession(res.user));

            // Hydrate active merged customer cart
            try {
                const customerCart = await api.cart.get();
                dispatch(setCart(customerCart));
            } catch {
                // If cart empty or unavailable
            }

            toast.success(`Welcome back, ${res.user.firstName}!`);
            router.push("/account");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Invalid email or password";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-zinc-50 min-h-screen py-16 px-4 flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200/80 shadow-md max-w-md w-full space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                        <Leaf size={24} className="stroke-[2.5]" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                        Customer Sign In
                    </h1>
                    <p className="text-xs text-zinc-500">
                        Access your farm orders, saved addresses, and batch certificates.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="customer@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-zinc-700">
                                Password
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-[11px] text-emerald-700 hover:underline"
                            >
                                Forgot?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                        {isLoading ? (
                            <>
                                <Spinner size="sm" className="text-white" />
                                <span>Signing In...</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={15} />
                                <span>Sign In to Account</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="pt-2 text-center text-xs text-zinc-500 space-y-2 border-t border-zinc-100">
                    <p>
                        New customer?{" "}
                        <Link href="/register" className="font-bold text-emerald-700 hover:underline">
                            Create an Account
                        </Link>
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span>Protected by dual JWT HTTP-only tokens</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
