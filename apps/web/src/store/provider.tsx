"use client";

import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store, useAppDispatch } from "./index";
import { setSession, clearSession, setHydrated } from "./auth-slice";
import { setCart, setCartLoading } from "./cart-slice";
import { api, setAccessToken } from "../lib/api";

function AppHydrator({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        let isMounted = true;

        async function hydrate() {
            // 1. Hydrate Auth Session
            try {
                const session = await api.auth.refresh();
                if (isMounted && session?.accessToken) {
                    setAccessToken(session.accessToken);
                    dispatch(setSession(session.user));
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

            // 2. Hydrate Cart State
            try {
                dispatch(setCartLoading(true));
                const cart = await api.cart.get();
                if (isMounted) {
                    dispatch(setCart(cart));
                }
            } catch {
                if (isMounted) {
                    dispatch(setCart(null));
                }
            } finally {
                if (isMounted) {
                    dispatch(setCartLoading(false));
                }
            }
        }

        hydrate();

        return () => {
            isMounted = false;
        };
    }, [dispatch]);

    return <>{children}</>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <AppHydrator>{children}</AppHydrator>
        </Provider>
    );
}
