import { adminApi } from "../admin-api";
import type {
    CategoryResponse,
    CreateCategoryInput,
    UpdateCategoryInput,
    CategoryQueryOptions,
    ReorderCategoryItem,
} from "@ecommers/types";

export const categoriesApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<CategoryResponse[], CategoryQueryOptions | void>({
            query: (params) => ({
                url: "/categories",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items = Array.isArray(response) ? response : response?.data || response?.items || [];
                return Array.isArray(items) ? [...items] : [];
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((c) => ({ type: "Categories" as const, id: c.id })),
                        { type: "Categories", id: "LIST" },
                    ]
                    : [{ type: "Categories", id: "LIST" }],
        }),

        getCategoryById: builder.query<CategoryResponse, string>({
            query: (id) => ({
                url: `/categories/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, id) => [{ type: "Categories", id }],
        }),

        createCategory: builder.mutation<CategoryResponse, CreateCategoryInput>({
            query: (body) => ({
                url: "/categories",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Categories", id: "LIST" }],
        }),

        updateCategory: builder.mutation<CategoryResponse, { id: string; body: UpdateCategoryInput }>({
            query: ({ id, body }) => ({
                url: `/categories/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Categories", id },
                { type: "Categories", id: "LIST" },
            ],
        }),

        reorderCategories: builder.mutation<{ updatedCount: number }, ReorderCategoryItem[]>({
            query: (items) => ({
                url: "/categories/reorder",
                method: "PATCH",
                body: { items },
            }),
            invalidatesTags: [{ type: "Categories", id: "LIST" }],
        }),

        deleteCategory: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/categories/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_res, _err, id) => [
                { type: "Categories", id },
                { type: "Categories", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryByIdQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useReorderCategoriesMutation,
    useDeleteCategoryMutation,
} = categoriesApi;
