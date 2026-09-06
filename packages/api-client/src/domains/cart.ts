import type { ApiClient } from "../client.js";
import type { CartResponse, AddToCartInput } from "@ecommers/types";

export class CartClient {
    constructor(private readonly client: ApiClient) {}

    async get(): Promise<CartResponse> {
        return this.client.get<CartResponse>("/cart");
    }

    async addItem(body: AddToCartInput): Promise<CartResponse> {
        return this.client.post<CartResponse>("/cart/items", body);
    }

    async updateQuantity(variantId: string, quantity: number, expectedVersion: number): Promise<CartResponse> {
        return this.client.patch<CartResponse>(`/cart/items/${variantId}`, { quantity, expectedVersion });
    }

    async removeItem(variantId: string, expectedVersion: number): Promise<CartResponse> {
        return this.client.delete<CartResponse>(`/cart/items/${variantId}`, {
            body: JSON.stringify({ expectedVersion }),
        } as any);
    }

    async clear(): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>("/cart");
    }

    async merge(guestSessionId: string): Promise<CartResponse> {
        return this.client.post<CartResponse>("/cart/merge", { guestSessionId });
    }
}
