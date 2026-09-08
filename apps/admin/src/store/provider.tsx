"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./index";
import { setSession, clearSession, setHydrated } from "./auth-slice";
import { api, setAccessToken } from "../lib/api";

let inFlightHydrationPromise: Promise<void> | null = null;

function SessionHydrator({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // If already hydrated or authenticated, skip
        if (store.getState().auth.isHydrated && store.getState().auth.isAuthenticated) {
            return;
        }

        // If no active session cookie is present, mark hydrated immediately without calling backend
        const hasSessionCookie = typeof document !== "undefined" && document.cookie.includes("admin_session_active=1");
        if (!hasSessionCookie) {
            dispatch(setHydrated(true));
            return;
        }

        if (!inFlightHydrationPromise) {
            inFlightHydrationPromise = (async () => {
                try {
                    const res = await api.auth.adminRefresh();
                    setAccessToken(res.accessToken);
                    dispatch(setSession(res.user));
                } catch (err) {
                    console.error("Administrative session hydration failed:", err);
                    document.cookie = "admin_session_active=; path=/; max-age=0; SameSite=Lax";
                    setAccessToken(null);
                    dispatch(clearSession());
                } finally {
                    dispatch(setHydrated(true));
                    inFlightHydrationPromise = null;
                }
            })();
        }
    }, [dispatch]);

    return <>{children}</>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <SessionHydrator>{children}</SessionHydrator>
        </Provider>
    );
}
