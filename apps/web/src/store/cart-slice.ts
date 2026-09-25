import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CartResponse } from "@ecommers/types";

export interface CartState {
    cart: CartResponse | null;
    isCartOpen: boolean;
    isLoading: boolean;
}

const initialState: CartState = {
    cart: null,
    isCartOpen: false,
    isLoading: false,
};

export const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        setCart: (state, action: PayloadAction<CartResponse | null>) => {
            state.cart = action.payload;
            state.isLoading = false;
        },
        setCartOpen: (state, action: PayloadAction<boolean>) => {
            state.isCartOpen = action.payload;
        },
        toggleCart: (state) => {
            state.isCartOpen = !state.isCartOpen;
        },
        setCartLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setCart, setCartOpen, toggleCart, setCartLoading } = cartSlice.actions;
export default cartSlice.reducer;
