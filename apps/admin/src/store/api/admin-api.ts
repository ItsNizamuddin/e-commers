import { createApi } from "@reduxjs/toolkit/query/react";
import { apiClientBaseQuery } from "./base-query";
import type {
    ProductResponse,
    AdminProductResponse,
    CreateProductInput,
    UpdateProductInput,
    ProductQueryOptions,
} from "@ecommers/types";

export interface PaginatedProductsResponse {
    items: ProductResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    total: number;
    totalPages: number;
}

export const adminApi = createApi({
    reducerPath: "adminApi",
    baseQuery: apiClientBaseQuery(),
    tagTypes: [
        "Products",
        "Categories",
        "Orders",
        "Manufacturing",
        "Recipes",
        "RawMaterials",
        "Vendors",
        "Purchases",
        "Inventory",
        "Locations",
        "Reviews",
        "Staff",
        "Customers",
        "Analytics",
        "AuditLogs",
        "Jobs",
        "Seo",
    ],
    endpoints: (builder) => ({
        // Products Endpoints
        getProducts: builder.query<PaginatedProductsResponse, ProductQueryOptions | void>({
            query: (params) => ({
                url: "/products",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items: ProductResponse[] = Array.isArray(response)
                    ? response
                    : response?.items || response?.data || [];
                const rawMeta = response?.pagination || response?.meta || {};
                const total = Number(rawMeta?.total ?? items.length) || 0;
                const limit = Number(rawMeta?.limit ?? 10) || 10;
                const page = Number(rawMeta?.page ?? 1) || 1;
                const totalPages = Number(rawMeta?.totalPages ?? Math.ceil(total / limit)) || 1;

                return {
                    items,
                    pagination: { page, limit, total, totalPages },
                    total,
                    totalPages,
                };
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((p) => ({ type: "Products" as const, id: p.id })),
                        { type: "Products", id: "LIST" },
                    ]
                    : [{ type: "Products", id: "LIST" }],
        }),

        getProductById: builder.query<ProductResponse, string>({
            query: (id) => ({
                url: `/products/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_result, _error, id) => [{ type: "Products", id }],
        }),

        createProduct: builder.mutation<AdminProductResponse, CreateProductInput>({
            query: (body) => ({
                url: "/products",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Products", id: "LIST" }],
        }),

        updateProduct: builder.mutation<AdminProductResponse, { id: string; body: UpdateProductInput }>({
            query: ({ id, body }) => ({
                url: `/products/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: "Products", id },
                { type: "Products", id: "LIST" },
            ],
        }),

        deleteProduct: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/products/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "Products", id },
                { type: "Products", id: "LIST" },
            ],
        }),

        publishProduct: builder.mutation<ProductResponse, string>({
            query: (id) => ({
                url: `/products/${id}/publish`,
                method: "PATCH",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "Products", id },
                { type: "Products", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetProductsQuery,
    useGetProductByIdQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    usePublishProductMutation,
} = adminApi;
