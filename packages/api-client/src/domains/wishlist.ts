import type { ApiClient } from "../client.js";
import type { WishlistResponse, AddToWishlistInput } from "@ecommers/types";

export class WishlistClient {
    constructor(private readonly client: ApiClient) {}

    async get(currency?: string): Promise<WishlistResponse> {
        return this.client.get<WishlistResponse>("/wishlist", { params: { currency } });
    }

    async addItem(body: AddToWishlistInput): Promise<WishlistResponse> {
        return this.client.post<WishlistResponse>("/wishlist/items", body);
    }

    async removeItem(variantId: string): Promise<WishlistResponse> {
        return this.client.delete<WishlistResponse>(`/wishlist/items/${variantId}`);
    }

    async moveToCart(variantId: string, quantity: number = 1): Promise<WishlistResponse> {
        return this.client.post<WishlistResponse>(`/wishlist/items/${variantId}/move-to-cart`, { quantity });
    }

    async clear(): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>("/wishlist");
    }
}
