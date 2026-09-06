import type { ApiClient } from "../client.js";
import type { CheckoutResponse, UpdateCheckoutAddressesInput, InitCheckoutInput } from "@ecommers/types";

export class CheckoutClient {
    constructor(private readonly client: ApiClient) {}

    async initiate(body?: InitCheckoutInput): Promise<CheckoutResponse> {
        return this.client.post<CheckoutResponse>("/checkout", body);
    }

    async getById(id: string): Promise<CheckoutResponse> {
        return this.client.get<CheckoutResponse>(`/checkout/${id}`);
    }

    async updateAddresses(id: string, body: UpdateCheckoutAddressesInput): Promise<CheckoutResponse> {
        return this.client.patch<CheckoutResponse>(`/checkout/${id}/addresses`, body);
    }

    async cancel(id: string): Promise<CheckoutResponse> {
        return this.client.post<CheckoutResponse>(`/checkout/${id}/cancel`);
    }
}
