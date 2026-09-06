import type { ApiClient } from "../client";
import type {
    InventoryResponse,
    StockMovementResponse,
    AdjustInventoryInput,
    UpdateInventoryThresholdsInput,
    InventoryQueryOptions,
    StockMovementQueryOptions,
} from "@ecommers/types";

export interface InventoryListResponse {
    items: InventoryResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface StockMovementListResponse {
    items: StockMovementResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class InventoryClient {
    constructor(private readonly client: ApiClient) {}

    async list(params?: InventoryQueryOptions): Promise<InventoryListResponse> {
        return this.client.get<InventoryListResponse>("/admin/inventory", { params });
    }

    async getById(id: string): Promise<InventoryResponse> {
        return this.client.get<InventoryResponse>(`/admin/inventory/${id}`);
    }

    async adjust(body: AdjustInventoryInput): Promise<{ inventory: InventoryResponse; movement: StockMovementResponse }> {
        return this.client.post<{ inventory: InventoryResponse; movement: StockMovementResponse }>("/admin/inventory/adjust", body);
    }

    async movements(params?: StockMovementQueryOptions): Promise<StockMovementListResponse> {
        return this.client.get<StockMovementListResponse>("/admin/inventory/movements", { params });
    }

    async updateThresholds(id: string, body: UpdateInventoryThresholdsInput): Promise<InventoryResponse> {
        return this.client.patch<InventoryResponse>(`/admin/inventory/${id}/thresholds`, body);
    }
}
