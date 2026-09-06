import type { ApiClient } from "../client";
import type { OrderResponse, OrderListQuery, UpdateFulfillmentInput, CancelOrderInput } from "@ecommers/types";

export interface OrderListResponse {
    items: OrderResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class OrdersClient {
    constructor(private readonly client: ApiClient) {}

    async myOrders(params?: OrderListQuery): Promise<OrderListResponse> {
        return this.client.get<OrderListResponse>("/orders/me", { params });
    }

    async getById(id: string): Promise<OrderResponse> {
        return this.client.get<OrderResponse>(`/orders/${id}`);
    }

    async cancel(id: string, body?: CancelOrderInput): Promise<OrderResponse> {
        return this.client.post<OrderResponse>(`/orders/${id}/cancel`, body);
    }

    async adminList(params?: OrderListQuery): Promise<OrderListResponse> {
        return this.client.get<OrderListResponse>("/orders/admin/all", { params });
    }

    async adminGetById(id: string): Promise<OrderResponse> {
        return this.client.get<OrderResponse>(`/orders/admin/${id}`);
    }

    async adminUpdateFulfillment(id: string, body: UpdateFulfillmentInput): Promise<OrderResponse> {
        return this.client.patch<OrderResponse>(`/orders/admin/${id}/fulfillment`, body);
    }

    async adminCancel(id: string, body?: CancelOrderInput): Promise<OrderResponse> {
        return this.client.post<OrderResponse>(`/orders/admin/${id}/cancel`, body);
    }
}
