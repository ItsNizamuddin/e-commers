"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "../../lib/api";
import { useAppDispatch } from "../../store";
import { setSession } from "../../store/auth-slice";
import { setCart } from "../../store/cart-slice";
import { toast, Spinner } from "@ecommers/ui";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                        nonce?: string;
                        auto_select?: boolean;
                        cancel_on_tap_outside?: boolean;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            theme?: "outline" | "filled_blue" | "filled_black";
                            size?: "large" | "medium" | "small";
                            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
                            shape?: "rectangular" | "pill" | "circle" | "square";
                            width?: number | string;
                        }
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    mode?: "signin" | "signup";
    className?: string;
}

export function GoogleSignInButton({ mode = "signin", className = "" }: GoogleSignInButtonProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState("/account");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect");
            if (redirect) {
                setRedirectUrl(redirect);
            }
        }
    }, []);

    const handleGoogleAuth = async (idToken: string, nonce: string) => {
        try {
            setIsLoading(true);
            const res = await api.auth.googleLogin({
                idToken,
                nonce,
            });

            setAccessToken(res.accessToken);
            dispatch(setSession(res.user));

            try {
                const customerCart = await api.cart.get();
                dispatch(setCart(customerCart));
            } catch {
                // If cart is empty or unavailable
            }

            toast.success(`Welcome, ${res.user.firstName}!`);
            router.push(redirectUrl);
        } catch (error: any) {
            const code = error?.code || error?.error?.code;
            if (code === "REQUIRE_ACCOUNT_LINKING") {
                toast.error(
                    "An account with this email already exists. Please log in with your password to link Google."
                );
            } else {
                toast.error(error?.message || "Google authentication failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            return;
        }

        // Load GIS script if not present
        const existingScript = document.getElementById("google-gsi-script");
        if (!existingScript) {
            const script = document.createElement("script");
            script.id = "google-gsi-script";
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => setScriptLoaded(true);
            document.head.appendChild(script);
        } else {
            setScriptLoaded(true);
        }
    }, []);

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!scriptLoaded || !clientId || !window.google?.accounts?.id || !containerRef.current) {
            return;
        }

        const clientNonce =
            typeof window !== "undefined" && window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        window.google.accounts.id.initialize({
            client_id: clientId,
            nonce: clientNonce,
            callback: (response: { credential: string }) => {
                if (response.credential) {
                    void handleGoogleAuth(response.credential, clientNonce);
                }
            },
        });

        // Clear previous buttons
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
            theme: "outline",
            size: "large",
            text: mode === "signup" ? "signup_with" : "signin_with",
            shape: "rectangular",
            width: "100%",
        });
    }, [scriptLoaded, mode]);

    const handleManualDevClick = async () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        // In local development or testing mode where Google GSI script isn't configured with a live OAuth client ID
        if (!clientId) {
            const devNonce = `client_nonce_dev_${Date.now()}`;
            const devMockToken = `mock-google-token-sub101-googleuser`;
            await handleGoogleAuth(devMockToken, devNonce);
            return;
        }

        // If client ID is present, prompt One-Tap or button
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        }
    };

    return (
        <div className={`w-full space-y-2 ${className}`}>
            <div ref={containerRef} className="w-full flex justify-center min-h-[40px]" />
            {(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !scriptLoaded) && (
                <button
                    type="button"
                    onClick={handleManualDevClick}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                    {isLoading ? (
                        <>
                            <Spinner size="sm" className="text-zinc-600" />
                            <span>Authenticating with Google...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            <span>
                                {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
                            </span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
