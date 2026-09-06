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
import { Lock, Mail, AlertCircle, Shield } from "lucide-react";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [loginError, setLoginError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setLoginError(null);
        try {
            const res = await api.auth.adminLogin(data);
            setAccessToken(res.accessToken);
            dispatch(setSession(res.user));
            router.replace("/dashboard");
        } catch (err: unknown) {
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
                backgroundColor: "#0f172a",
                padding: "1.5rem",
            }}
        >
            <div style={{ width: "100%", maxWidth: "420px" }}>
                {/* Brand Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            backgroundColor: "#2563eb",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            marginBottom: "1rem",
                            boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)",
                        }}
                    >
                        <Shield size={26} />
                    </div>
                    <h1
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "#f8fafc",
                            letterSpacing: "-0.025em",
                            marginBottom: "0.25rem",
                        }}
                    >
                        ecommers Backoffice
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
                        Administrative Portal & Control Plane
                    </p>
                </div>

                {/* Login Card */}
                <Card
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                        border: "1px solid #e2e8f0",
                        padding: "2rem",
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
                                placeholder="admin@ecommers.local"
                                leadingIcon={<Mail size={16} />}
                                error={errors.email?.message}
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
                                type="password"
                                placeholder="••••••••"
                                leadingIcon={<Lock size={16} />}
                                error={errors.password?.message}
                                {...register("password")}
                            />
                        </FormField>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={isSubmitting}
                            style={{ width: "100%", marginTop: "0.5rem" }}
                        >
                            Sign In to Portal
                        </Button>
                    </form>
                </Card>

                {/* Secure Notice */}
                <p
                    style={{
                        textAlign: "center",
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginTop: "1.5rem",
                    }}
                >
                    Authorized personnel only. Sessions and access attempts are monitored and audited.
                </p>
            </div>
        </div>
    );
}
