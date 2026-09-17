import { adminApi } from "../admin-api";
import type {
    RawMaterial,
    CreateRawMaterialInput,
    UpdateRawMaterialInput,
    RawMaterialLot,
    RawMaterialStockMovement,
    RecordPurchaseIntakeInput,
    Recipe,
    CreateRecipeInput,
    UpdateRecipeInput,
    ProductionRun,
    ExecuteProductionInput,
    ReverseProductionInput,
    RepackagingRun,
    CreateRepackagingRunInput,
    ReverseRepackagingRunInput,
    ProductionFeasibilityCheck,
    Vendor,
    CreateVendorInput,
    UpdateVendorInput,
} from "@ecommers/types";

function normalizeItem<T>(item: any): T {
    if (!item || typeof item !== "object") return item;
    if (item._id && !item.id) {
        return { ...item, id: item._id.toString() };
    }
    return item as T;
}

function extractList<T>(res: any): T[] {
    const data = res?.data !== undefined ? res.data : res;
    let items: any[] = [];
    if (Array.isArray(data)) items = data;
    else if (data && typeof data === "object") {
        if (Array.isArray(data.items)) items = data.items;
        else if (Array.isArray(data.data)) items = data.data;
    }
    return items.map((item) => normalizeItem<T>(item));
}

function extractData<T>(res: any): T {
    const data = res?.data !== undefined ? res.data : res;
    return normalizeItem<T>(data);
}

export const manufacturingApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        // Raw Materials
        getRawMaterials: builder.query<RawMaterial[], { search?: string; category?: string; usage?: string; isActive?: boolean } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/raw-materials",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<RawMaterial>(response),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((rm) => ({ type: "RawMaterials" as const, id: rm.id })),
                        { type: "RawMaterials", id: "LIST" },
                    ]
                    : [{ type: "RawMaterials", id: "LIST" }],
        }),

        getRawMaterialById: builder.query<RawMaterial, string>({
            query: (id) => ({
                url: `/admin/manufacturing/raw-materials/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractData<RawMaterial>(response),
            providesTags: (_res, _err, id) => [{ type: "RawMaterials", id }],
        }),

        createRawMaterial: builder.mutation<RawMaterial, CreateRawMaterialInput>({
            query: (body) => ({
                url: "/admin/manufacturing/raw-materials",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "RawMaterials", id: "LIST" }],
        }),

        updateRawMaterial: builder.mutation<RawMaterial, { id: string; body: UpdateRawMaterialInput }>({
            query: ({ id, body }) => ({
                url: `/admin/manufacturing/raw-materials/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "RawMaterials", id },
                { type: "RawMaterials", id: "LIST" },
            ],
        }),

        deleteRawMaterial: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/admin/manufacturing/raw-materials/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_res, _err, id) => [
                { type: "RawMaterials", id },
                { type: "RawMaterials", id: "LIST" },
            ],
        }),

        // Lots & Ledger
        getRawMaterialLots: builder.query<RawMaterialLot[], { rawMaterialId?: string; isDepleted?: boolean; status?: string } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/lots",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<RawMaterialLot>(response),
            providesTags: [{ type: "RawMaterials", id: "LOTS" }],
        }),

        getRawMaterialLedger: builder.query<RawMaterialStockMovement[], { rawMaterialId?: string; lotId?: string; type?: string; limit?: number } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/ledger",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<RawMaterialStockMovement>(response),
            providesTags: [{ type: "RawMaterials", id: "LEDGER" }],
        }),

        // Purchases
        getPurchases: builder.query<any[], { vendorId?: string; search?: string } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/purchases",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<any>(response),
            providesTags: [{ type: "Purchases", id: "LIST" }],
        }),

        createPurchase: builder.mutation<any, RecordPurchaseIntakeInput>({
            query: (body) => ({
                url: "/admin/manufacturing/purchases",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                { type: "Purchases", id: "LIST" },
                { type: "RawMaterials", id: "LIST" },
                { type: "RawMaterials", id: "LOTS" },
                { type: "RawMaterials", id: "LEDGER" },
            ],
        }),

        // Vendors
        getVendors: builder.query<Vendor[], { search?: string; status?: string; isActive?: boolean } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/vendors",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<Vendor>(response),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((v) => ({ type: "Vendors" as const, id: v.id })),
                        { type: "Vendors", id: "LIST" },
                    ]
                    : [{ type: "Vendors", id: "LIST" }],
        }),

        getVendorById: builder.query<Vendor, string>({
            query: (id) => ({
                url: `/admin/manufacturing/vendors/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractData<Vendor>(response),
            providesTags: (_res, _err, id) => [{ type: "Vendors", id }],
        }),

        createVendor: builder.mutation<Vendor, CreateVendorInput>({
            query: (body) => ({
                url: "/admin/manufacturing/vendors",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Vendors", id: "LIST" }],
        }),

        updateVendor: builder.mutation<Vendor, { id: string; body: UpdateVendorInput }>({
            query: ({ id, body }) => ({
                url: `/admin/manufacturing/vendors/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Vendors", id },
                { type: "Vendors", id: "LIST" },
            ],
        }),

        getVendorPurchases: builder.query<RawMaterialLot[], string>({
            query: (id) => ({
                url: `/admin/manufacturing/vendors/${id}/purchases`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractList<RawMaterialLot>(response),
            providesTags: (_res, _err, id) => [
                { type: "Vendors", id: `PURCHASES_${id}` },
                { type: "Purchases", id: "LIST" },
            ],
        }),

        // Recipes
        getRecipes: builder.query<Recipe[], { search?: string; category?: string; isActive?: boolean } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/recipes",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<Recipe>(response),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((r) => ({ type: "Recipes" as const, id: r.id })),
                        { type: "Recipes", id: "LIST" },
                    ]
                    : [{ type: "Recipes", id: "LIST" }],
        }),

        getRecipeById: builder.query<Recipe, string>({
            query: (id) => ({
                url: `/admin/manufacturing/recipes/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractData<Recipe>(response),
            providesTags: (_res, _err, id) => [{ type: "Recipes", id }],
        }),

        createRecipe: builder.mutation<Recipe, CreateRecipeInput>({
            query: (body) => ({
                url: "/admin/manufacturing/recipes",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Recipes", id: "LIST" }],
        }),

        updateRecipe: builder.mutation<Recipe, { id: string; body: UpdateRecipeInput }>({
            query: ({ id, body }) => ({
                url: `/admin/manufacturing/recipes/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Recipes", id },
                { type: "Recipes", id: "LIST" },
            ],
        }),

        deleteRecipe: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/admin/manufacturing/recipes/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_res, _err, id) => [
                { type: "Recipes", id },
                { type: "Recipes", id: "LIST" },
            ],
        }),

        // Production Runs
        getProductionRuns: builder.query<ProductionRun[], { recipeId?: string; status?: string } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/runs",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<ProductionRun>(response),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((pr) => ({ type: "Manufacturing" as const, id: pr.id })),
                        { type: "Manufacturing", id: "RUNS" },
                    ]
                    : [{ type: "Manufacturing", id: "RUNS" }],
        }),

        getProductionRunById: builder.query<ProductionRun, string>({
            query: (id) => ({
                url: `/admin/manufacturing/runs/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractData<ProductionRun>(response),
            providesTags: (_res, _err, id) => [{ type: "Manufacturing", id }],
        }),

        checkProductionFeasibility: builder.query<ProductionFeasibilityCheck, { recipeId: string; plannedQuantity: number }>({
            query: ({ recipeId, plannedQuantity }) => ({
                url: "/admin/manufacturing/runs/check-feasibility",
                method: "GET",
                params: { recipeId, plannedQuantity },
            }),
            transformResponse: (response: any) => extractData<ProductionFeasibilityCheck>(response),
        }),

        createProductionRun: builder.mutation<ProductionRun, ExecuteProductionInput>({
            query: (body) => ({
                url: "/admin/manufacturing/runs",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                { type: "Manufacturing", id: "RUNS" },
                { type: "RawMaterials", id: "LOTS" },
                { type: "RawMaterials", id: "LEDGER" },
                { type: "Inventory", id: "LIST" },
            ],
        }),

        reverseProductionRun: builder.mutation<ProductionRun, { id: string; body: ReverseProductionInput }>({
            query: ({ id, body }) => ({
                url: `/admin/manufacturing/runs/${id}/reverse`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Manufacturing", id },
                { type: "Manufacturing", id: "RUNS" },
                { type: "RawMaterials", id: "LOTS" },
                { type: "RawMaterials", id: "LEDGER" },
                { type: "Inventory", id: "LIST" },
            ],
        }),

        // Repackaging Runs
        getRepackagingRuns: builder.query<RepackagingRun[], { status?: string } | void>({
            query: (params) => ({
                url: "/admin/manufacturing/repackaging",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => extractList<RepackagingRun>(response),
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((rr) => ({ type: "Manufacturing" as const, id: `REPACK_${rr.id}` })),
                        { type: "Manufacturing", id: "REPACKAGING_RUNS" },
                    ]
                    : [{ type: "Manufacturing", id: "REPACKAGING_RUNS" }],
        }),

        getRepackagingRunById: builder.query<RepackagingRun, string>({
            query: (id) => ({
                url: `/admin/manufacturing/repackaging/${id}`,
                method: "GET",
            }),
            transformResponse: (response: any) => extractData<RepackagingRun>(response),
            providesTags: (_res, _err, id) => [{ type: "Manufacturing", id: `REPACK_${id}` }],
        }),

        createRepackagingRun: builder.mutation<RepackagingRun, CreateRepackagingRunInput>({
            query: (body) => ({
                url: "/admin/manufacturing/repackaging",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                { type: "Manufacturing", id: "REPACKAGING_RUNS" },
                { type: "RawMaterials", id: "LOTS" },
                { type: "RawMaterials", id: "LEDGER" },
                { type: "Inventory", id: "LIST" },
            ],
        }),

        reverseRepackagingRun: builder.mutation<RepackagingRun, { id: string; body: ReverseRepackagingRunInput }>({
            query: ({ id, body }) => ({
                url: `/admin/manufacturing/repackaging/${id}/reverse`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Manufacturing", id: `REPACK_${id}` },
                { type: "Manufacturing", id: "REPACKAGING_RUNS" },
                { type: "RawMaterials", id: "LOTS" },
                { type: "RawMaterials", id: "LEDGER" },
                { type: "Inventory", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetRawMaterialsQuery,
    useGetRawMaterialByIdQuery,
    useCreateRawMaterialMutation,
    useUpdateRawMaterialMutation,
    useDeleteRawMaterialMutation,
    useGetRawMaterialLotsQuery,
    useGetRawMaterialLedgerQuery,
    useGetPurchasesQuery,
    useCreatePurchaseMutation,
    useGetVendorsQuery,
    useGetVendorByIdQuery,
    useGetVendorPurchasesQuery,
    useCreateVendorMutation,
    useUpdateVendorMutation,
    useGetRecipesQuery,
    useGetRecipeByIdQuery,
    useCreateRecipeMutation,
    useUpdateRecipeMutation,
    useDeleteRecipeMutation,
    useGetProductionRunsQuery,
    useGetProductionRunByIdQuery,
    useCheckProductionFeasibilityQuery,
    useCreateProductionRunMutation,
    useReverseProductionRunMutation,
    useGetRepackagingRunsQuery,
    useGetRepackagingRunByIdQuery,
    useCreateRepackagingRunMutation,
    useReverseRepackagingRunMutation,
} = manufacturingApi;
