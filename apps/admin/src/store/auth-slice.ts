import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { UserResponse, UserRole, Permission } from "@ecommers/types";
import { ROLE_PERMISSIONS } from "@ecommers/types";

export interface AdminAuthState {
    user: UserResponse | null;
    role: UserRole | null;
    permissions: Permission[];
    isAuthenticated: boolean;
    isHydrated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AdminAuthState = {
    user: null,
    role: null,
    permissions: [],
    isAuthenticated: false,
    isHydrated: false,
    isLoading: false,
    error: null,
};

export const adminAuthSlice = createSlice({
    name: "adminAuth",
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        setSession: (state, action: PayloadAction<UserResponse>) => {
            const user = action.payload;
            state.user = user;
            state.role = user.role;
            state.permissions = [...(ROLE_PERMISSIONS[user.role] || [])];
            state.isAuthenticated = true;
            state.isHydrated = true;
            state.isLoading = false;
            state.error = null;
        },
        clearSession: (state) => {
            state.user = null;
            state.role = null;
            state.permissions = [];
            state.isAuthenticated = false;
            state.isHydrated = true;
            state.isLoading = false;
            state.error = null;
        },
        setHydrated: (state, action: PayloadAction<boolean>) => {
            state.isHydrated = action.payload;
        },
    },
});

export const { setLoading, setError, setSession, clearSession, setHydrated } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
