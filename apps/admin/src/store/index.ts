import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import adminAuthReducer from "./auth-slice";
import adminUiReducer from "./ui-slice";
import { adminApi } from "./api/admin-api";

export const store = configureStore({
    reducer: {
        auth: adminAuthReducer,
        ui: adminUiReducer,
        [adminApi.reducerPath]: adminApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActionPaths: ["meta.baseQueryMeta", "meta.arg.originalArgs", "payload.headers"],
                ignoredPaths: [adminApi.reducerPath],
            },
        }).concat(adminApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
