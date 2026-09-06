import type { ApiClient } from "../client";
import type { PaymentResponse, CreatePaymentIntentInput } from "@ecommers/types";

export class PaymentsClient {
    constructor(private readonly client: ApiClient) {}

    async createIntent(body: CreatePaymentIntentInput): Promise<PaymentResponse> {
        return this.client.post<PaymentResponse>("/payments/intent", body);
    }

    async getById(id: string): Promise<PaymentResponse> {
        return this.client.get<PaymentResponse>(`/payments/${id}`);
    }
}
