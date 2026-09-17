import { adminApi } from "../admin-api";
import type {
    InventoryResponse,
    StockMovementResponse,
    AdjustInventoryInput,
    UpdateInventoryThresholdsInput,
    InventoryQueryOptions,
    StockMovementQueryOptions,
} from "@ecommers/types";

export interface PaginatedInventoryResponse {
    items: InventoryResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    total: number;
    totalPages: number;
}

export interface PaginatedMovementsResponse {
    items: StockMovementResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    total: number;
    totalPages: number;
}

export const inventoryApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getInventoryList: builder.query<PaginatedInventoryResponse, InventoryQueryOptions | void>({
            query: (params) => ({
                url: "/admin/inventory",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items: InventoryResponse[] = Array.isArray(response)
                    ? response
                    : response?.items || response?.data || [];
                const rawMeta = response?.pagination || response?.meta || {};
                const total = Number(rawMeta?.total ?? items.length) || 0;
                const limit = Number(rawMeta?.limit ?? 10) || 10;
                const page = Number(rawMeta?.page ?? 1) || 1;
                const totalPages = Number(rawMeta?.totalPages ?? Math.ceil(total / limit)) || 1;

                return {
                    items: [...items],
                    pagination: { page, limit, total, totalPages },
                    total,
                    totalPages,
                };
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((i) => ({ type: "Inventory" as const, id: i.id })),
                        { type: "Inventory", id: "LIST" },
                    ]
                    : [{ type: "Inventory", id: "LIST" }],
        }),

        getInventoryById: builder.query<InventoryResponse, string>({
            query: (id) => ({
                url: `/admin/inventory/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, id) => [{ type: "Inventory", id }],
        }),

        adjustInventory: builder.mutation<{ inventory: InventoryResponse; movement: StockMovementResponse }, AdjustInventoryInput>({
            query: (body) => ({
                url: "/admin/inventory/adjust",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Inventory", id: "LIST" }],
        }),

        getInventoryMovements: builder.query<PaginatedMovementsResponse, StockMovementQueryOptions | void>({
            query: (params) => ({
                url: "/admin/inventory/movements",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items: StockMovementResponse[] = Array.isArray(response)
                    ? response
                    : response?.items || response?.data || [];
                const rawMeta = response?.pagination || response?.meta || {};
                const total = Number(rawMeta?.total ?? items.length) || 0;
                const limit = Number(rawMeta?.limit ?? 10) || 10;
                const page = Number(rawMeta?.page ?? 1) || 1;
                const totalPages = Number(rawMeta?.totalPages ?? Math.ceil(total / limit)) || 1;

                return {
                    items: [...items],
                    pagination: { page, limit, total, totalPages },
                    total,
                    totalPages,
                };
            },
            providesTags: [{ type: "Inventory", id: "MOVEMENTS" }],
        }),

        updateInventoryThresholds: builder.mutation<InventoryResponse, { id: string; body: UpdateInventoryThresholdsInput }>({
            query: ({ id, body }) => ({
                url: `/admin/inventory/${id}/thresholds`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Inventory", id },
                { type: "Inventory", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetInventoryListQuery,
    useGetInventoryByIdQuery,
    useAdjustInventoryMutation,
    useGetInventoryMovementsQuery,
    useUpdateInventoryThresholdsMutation,
} = inventoryApi;
