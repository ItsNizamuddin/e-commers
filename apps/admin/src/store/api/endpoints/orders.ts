import { adminApi } from "../admin-api";
import type {
    OrderResponse,
    OrderListQuery,
    UpdateFulfillmentInput,
    CancelOrderInput,
    PackingSessionResponse,
    StartPackingInput,
    PackingScanInput,
    ResetPackingInput,
    ShipOrderInput,
    PackingScanResult,
} from "@ecommers/types";

export interface PaginatedOrdersResponse {
    items: OrderResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    total: number;
    totalPages: number;
}

export interface VerifyPackingScanResultPayload {
    session: PackingSessionResponse;
    scanResult: PackingScanResult;
    message: string;
    scannedLotNumber?: string;
}

export const ordersApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getAdminOrders: builder.query<PaginatedOrdersResponse, OrderListQuery | void>({
            query: (params) => ({
                url: "/orders/admin/all",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items: OrderResponse[] = Array.isArray(response)
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
                        ...result.items.map((o) => ({ type: "Orders" as const, id: o.id })),
                        { type: "Orders", id: "LIST" },
                    ]
                    : [{ type: "Orders", id: "LIST" }],
        }),

        getAdminOrderById: builder.query<OrderResponse, string>({
            query: (id) => ({
                url: `/orders/admin/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, id) => [{ type: "Orders", id }],
        }),

        updateOrderFulfillment: builder.mutation<OrderResponse, { id: string; body: UpdateFulfillmentInput }>({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/fulfillment`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Orders", id },
                { type: "Orders", id: "LIST" },
            ],
        }),

        cancelAdminOrder: builder.mutation<OrderResponse, { id: string; body?: CancelOrderInput }>({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/cancel`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Orders", id },
                { type: "Orders", id: "LIST" },
            ],
        }),

        // Packing Session Endpoints
        getPackingSession: builder.query<PackingSessionResponse, string>({
            query: (id) => ({
                url: `/orders/admin/${id}/packing`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, id) => [{ type: "Orders", id: `PACKING_${id}` }],
        }),

        startPackingSession: builder.mutation<PackingSessionResponse, { id: string; body?: StartPackingInput }>({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/packing/start`,
                method: "POST",
                body: body || {},
            }),
            transformResponse: (response: any) => response?.data || response,
            invalidatesTags: (_res, _err, { id }) => [{ type: "Orders", id: `PACKING_${id}` }],
        }),

        verifyPackingScan: builder.mutation<
            VerifyPackingScanResultPayload,
            { id: string; body: PackingScanInput }
        >({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/packing/scan`,
                method: "POST",
                body,
            }),
            transformResponse: (response: any) => response?.data || response,
            invalidatesTags: (_res, _err, { id }) => [{ type: "Orders", id: `PACKING_${id}` }],
        }),

        resetPackingSession: builder.mutation<PackingSessionResponse, { id: string; body: ResetPackingInput }>({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/packing/reset`,
                method: "POST",
                body,
            }),
            transformResponse: (response: any) => response?.data || response,
            invalidatesTags: (_res, _err, { id }) => [{ type: "Orders", id: `PACKING_${id}` }],
        }),

        shipOrder: builder.mutation<OrderResponse, { id: string; body: ShipOrderInput }>({
            query: ({ id, body }) => ({
                url: `/orders/admin/${id}/ship`,
                method: "POST",
                body,
            }),
            transformResponse: (response: any) => response?.data || response,
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Orders", id },
                { type: "Orders", id: `PACKING_${id}` },
                { type: "Orders", id: "LIST" },
                { type: "Inventory", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetAdminOrdersQuery,
    useGetAdminOrderByIdQuery,
    useUpdateOrderFulfillmentMutation,
    useCancelAdminOrderMutation,
    useGetPackingSessionQuery,
    useStartPackingSessionMutation,
    useVerifyPackingScanMutation,
    useResetPackingSessionMutation,
    useShipOrderMutation,
} = ordersApi;

