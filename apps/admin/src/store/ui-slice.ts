import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AdminUiState {
    sidebarCollapsed: boolean;
    activeModal: string | null;
}

const initialState: AdminUiState = {
    sidebarCollapsed: false,
    activeModal: null,
};

export const adminUiSlice = createSlice({
    name: "adminUi",
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
            state.sidebarCollapsed = action.payload;
        },
        openModal: (state, action: PayloadAction<string>) => {
            state.activeModal = action.payload;
        },
        closeModal: (state) => {
            state.activeModal = null;
        },
    },
});

export const { toggleSidebar, setSidebarCollapsed, openModal, closeModal } = adminUiSlice.actions;
export default adminUiSlice.reducer;
