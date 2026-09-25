import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { UserResponse } from "@ecommers/types";

export interface AuthState {
    user: UserResponse | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isHydrated: false,
};

export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<UserResponse>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.isHydrated = true;
        },
        clearSession: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isHydrated = true;
        },
        setHydrated: (state, action: PayloadAction<boolean>) => {
            state.isHydrated = action.payload;
        },
    },
});

export const { setSession, clearSession, setHydrated } = authSlice.actions;
export default authSlice.reducer;
