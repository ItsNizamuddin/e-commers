import type { ApiClient } from "../client.js";
import type {
    WalletResponse,
    WalletTransactionResponse,
    CreateTopUpIntentInput,
    TopUpIntentResponse,
    WalletConfig,
    UpdateWalletConfigInput,
    AdminWalletAdjustInput,
} from "@ecommers/types";

export interface ListTransactionsParams {
    page?: number;
    limit?: number;
    type?: "CREDIT" | "DEBIT";
    purpose?: string;
}

export interface ListTransactionsResponse {
    items: WalletTransactionResponse[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export class WalletClient {
    constructor(private readonly client: ApiClient) {}

    async get(): Promise<WalletResponse> {
        return this.client.get<WalletResponse>("/wallet");
    }

    async getTransactions(params?: ListTransactionsParams): Promise<ListTransactionsResponse> {
        return this.client.get<ListTransactionsResponse>("/wallet/transactions", { params });
    }

    async createTopUpIntent(input: CreateTopUpIntentInput): Promise<TopUpIntentResponse> {
        return this.client.post<TopUpIntentResponse>("/wallet/topup/intent", input);
    }

    // Admin Operations (ADMIN & SUPER_ADMIN only)
    async getConfig(): Promise<WalletConfig> {
        return this.client.get<WalletConfig>("/admin/wallet/config");
    }

    async updateConfig(input: UpdateWalletConfigInput): Promise<WalletConfig> {
        return this.client.put<WalletConfig>("/admin/wallet/config", input);
    }

    async adjustBalance(input: AdminWalletAdjustInput): Promise<{
        wallet: WalletResponse;
        transaction: WalletTransactionResponse;
    }> {
        return this.client.post<{
            wallet: WalletResponse;
            transaction: WalletTransactionResponse;
        }>("/admin/wallet/adjust", input);
    }

    async getCustomerWallet(userId: string, params?: { page?: number; limit?: number }): Promise<{
        wallet: WalletResponse;
        transactions: ListTransactionsResponse;
    }> {
        return this.client.get<{
            wallet: WalletResponse;
            transactions: ListTransactionsResponse;
        }>(`/admin/wallet/customer/${userId}`, { params });
    }
}

