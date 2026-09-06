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
import { Lock, Mail, AlertCircle, Shield, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
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
            router.replace("/dashboard");
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
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8fafc",
                backgroundImage: `
                    radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.06) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.05) 0px, transparent 50%)
                `,
                padding: "2rem 1.5rem",
            }}
        >
            <div style={{ width: "100%", maxWidth: "440px" }}>
                {/* Brand Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div
                        style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "14px",
                            backgroundColor: "#2563eb",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            marginBottom: "1rem",
                            boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.35)",
                        }}
                    >
                        <Shield size={28} />
                    </div>
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 800,
                            color: "#0f172a",
                            letterSpacing: "-0.03em",
                            marginBottom: "0.375rem",
                        }}
                    >
                        ecommers <span style={{ color: "#2563eb" }}>Admin</span>
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        Enterprise Control Plane & Store Operations
                    </p>
                </div>

                {/* Login Card */}
                <Card
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "16px",
                        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
                        border: "1px solid #e2e8f0",
                        padding: "2.25rem",
                    }}
                >
                    <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {loginError && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "0.75rem",
                                    padding: "0.75rem 1rem",
                                    backgroundColor: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "8px",
                                    color: "#991b1b",
                                    fontSize: "0.875rem",
                                }}
                            >
                                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
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
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#94a3b8",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "2px",
                                            borderRadius: "4px",
                                            transition: "color 0.15s ease",
                                        }}
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
                            style={{
                                width: "100%",
                                marginTop: "0.5rem",
                                fontWeight: 600,
                            }}
                        >
                            {isLoggingIn ? "Authenticating session..." : "Sign in to Dashboard"}
                        </Button>
                    </form>
                </Card>

                {/* Enterprise Footer */}
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "1.75rem",
                        fontSize: "0.75rem",
                        color: "var(--ec-text-subtle, #94a3b8)",
                    }}
                >
                    © {new Date().getFullYear()} ecommers • Enterprise Control Plane
                </div>
            </div>
        </div>
    );
}
