import type { ProductStatus } from "../product.js";
import type { CartResponse } from "../cart/cart.types.js";

export interface WishlistItemPrice {
    currency: string;
    amount: number;
    compareAtAmount?: number | undefined;
}

export interface WishlistItemInventory {
    inStock: boolean;
    availableQuantity: number;
}

export interface WishlistItemResponse {
    productId: string;
    variantId: string;
    addedAt: string;
    title: string;
    slug: string;
    sku: string;
    variantTitle?: string | undefined;
    thumbnail?: string | undefined;
    status: ProductStatus;
    isActive: boolean;
    price: WishlistItemPrice | null;
    inventory: WishlistItemInventory;
}

export interface WishlistResponse {
    id: string;
    userId: string;
    items: WishlistItemResponse[];
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AddToWishlistInput {
    productId: string;
    variantId: string;
}

export interface MoveWishlistItemToCartInput {
    quantity?: number | undefined;
    currency?: string | undefined;
}

export interface MoveWishlistItemToCartResponse {
    cart: CartResponse;
    wishlist: WishlistResponse;
    movedVariantId: string;
}
