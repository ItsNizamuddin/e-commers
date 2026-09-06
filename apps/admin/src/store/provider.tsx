"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./index";
import { setSession, clearSession, setHydrated } from "./auth-slice";
import { api, setAccessToken } from "../lib/api";

function SessionHydrator({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        let isMounted = true;

        async function hydrateSession() {
            try {
                const res = await api.auth.adminRefresh();
                if (isMounted) {
                    setAccessToken(res.accessToken);
                    dispatch(setSession(res.user));
                }
            } catch {
                if (isMounted) {
                    setAccessToken(null);
                    dispatch(clearSession());
                }
            } finally {
                if (isMounted) {
                    dispatch(setHydrated(true));
                }
            }
        }

        hydrateSession();

        return () => {
            isMounted = false;
        };
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
