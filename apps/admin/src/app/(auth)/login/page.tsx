"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, FormField } from "@ecommers/ui";
import { api, setAccessToken } from "../../../lib/api";
import { useAppDispatch } from "../../../store";
import { setSession } from "../../../store/auth-slice";
import { Lock, Mail, AlertCircle, Shield, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useTheme } from "../../../components/theme-provider";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { theme, toggleTheme } = useTheme();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setLoginError(null);
        setIsLoggingIn(true);
        try {
            const res = await api.auth.adminLogin(data);
            document.cookie = "admin_session_active=1; path=/; max-age=604800; SameSite=Lax";
            setAccessToken(res.accessToken);
            dispatch(setSession(res.user));
            router.replace("/account");
        } catch (err: unknown) {
            setIsLoggingIn(false);
            if (err instanceof Error) {
                setLoginError(err.message);
            } else {
                setLoginError("Failed to sign in. Please verify your credentials.");
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 relative transition-colors duration-200">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
            </div>

            {/* Top Right Quick Theme Switcher */}
            <div className="fixed top-5 right-5 z-50">
                <button
                    type="button"
                    onClick={toggleTheme}
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                    {theme === "dark" ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                </button>
            </div>

            <div className="w-full max-w-md">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="w-13 h-13 rounded-2xl bg-blue-600 inline-flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/25">
                        <Shield size={26} />
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1.5">
                        ecommers <span className="text-blue-600 dark:text-blue-400">Admin</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Enterprise Control Plane & Store Operations
                    </p>
                </div>

                {/* Login Card */}
                <Card className="p-8 sm:p-9 shadow-xl dark:shadow-2xl">
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
                        {loginError && (
                            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{loginError}</span>
                            </div>
                        )}

                        <FormField
                            label="Email Address"
                            required
                            error={errors.email?.message}
                            id="email"
                        >
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@ecommers.com"
                                leadingIcon={<Mail size={16} />}
                                error={errors.email?.message}
                                disabled={isLoggingIn}
                                {...register("email")}
                            />
                        </FormField>

                        <FormField
                            label="Password"
                            required
                            error={errors.password?.message}
                            id="password"
                        >
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                leadingIcon={<Lock size={16} />}
                                trailingIcon={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded"
                                        tabIndex={-1}
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                }
                                error={errors.password?.message}
                                disabled={isLoggingIn}
                                {...register("password")}
                            />
                        </FormField>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isLoggingIn}
                            disabled={isLoggingIn}
                            className="w-full mt-2 font-semibold"
                        >
                            {isLoggingIn ? "Authenticating session..." : "Sign in to Dashboard"}
                        </Button>
                    </form>
                </Card>

                {/* Enterprise Footer */}
                <div className="text-center mt-7 text-xs text-slate-400 dark:text-slate-500">
                    © {new Date().getFullYear()} ecommers • Enterprise Control Plane
                </div>
            </div>
        </div>
    );
}
