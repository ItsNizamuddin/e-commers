"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Leaf, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { toast, Spinner } from "@ecommers/ui";
import { GoogleSignInButton } from "../../components/auth/GoogleSignInButton";

export default function RegisterPage() {
    const router = useRouter();

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
            toast.error("Please fill in all required registration fields");
            return;
        }

        try {
            setIsLoading(true);
            await api.auth.register({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password: password.trim(),
            });

            toast.success("Account created successfully! Please sign in.");
            router.push("/login");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Registration failed";
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
                        Create Customer Account
                    </h1>
                    <p className="text-xs text-zinc-500">
                        Join our farm-direct community for verified pure organic foods.
                    </p>
                </div>

                <div className="space-y-4">
                    <GoogleSignInButton mode="signup" />

                    <div className="relative flex items-center justify-center">
                        <div className="border-t border-zinc-200 w-full" />
                        <span className="bg-white px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider absolute">
                            or register with email
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                First Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Aarav"
                                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
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
                                placeholder="Patel"
                                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
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
                            placeholder="customer@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Password *
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
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
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <UserPlus size={15} />
                                <span>Create Customer Account</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="pt-2 text-center text-xs text-zinc-500 space-y-2 border-t border-zinc-100">
                    <p>
                        Already have an account?{" "}
                        <Link href="/login" className="font-bold text-emerald-700 hover:underline">
                            Sign In
                        </Link>
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                        <ShieldCheck size={13} className="text-emerald-600" />
                        <span>Zero SPAM • 100% Privacy Respected</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
