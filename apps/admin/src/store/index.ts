import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import adminAuthReducer from "./auth-slice";
import adminUiReducer from "./ui-slice";

export const store = configureStore({
    reducer: {
        auth: adminAuthReducer,
        ui: adminUiReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
