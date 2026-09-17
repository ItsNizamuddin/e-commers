import { adminApi } from "../admin-api";
import type {
    LocationResponse,
    CreateLocationInput,
    UpdateLocationInput,
    BulkLocationUploadResult,
    LocationType,
    CheckPincodeResponse,
} from "@ecommers/types";

export const locationsApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getLocations: builder.query<LocationResponse[], { type?: LocationType; countryCode?: string; search?: string } | void>({
            query: (params) => ({
                url: "/locations",
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
                        ...result.map((l) => ({ type: "Locations" as const, id: l.id })),
                        { type: "Locations", id: "LIST" },
                    ]
                    : [{ type: "Locations", id: "LIST" }],
        }),

        getAdminLocations: builder.query<LocationResponse[], { type?: LocationType; countryCode?: string; isActive?: boolean; search?: string } | void>({
            query: (params) => ({
                url: "/admin/locations",
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
                        ...result.map((l) => ({ type: "Locations" as const, id: l.id })),
                        { type: "Locations", id: "ADMIN_LIST" },
                    ]
                    : [{ type: "Locations", id: "ADMIN_LIST" }],
        }),

        getLocationById: builder.query<LocationResponse, string>({
            query: (idOrCode) => ({
                url: `/locations/${idOrCode}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, id) => [{ type: "Locations", id }],
        }),

        createLocation: builder.mutation<LocationResponse, CreateLocationInput>({
            query: (body) => ({
                url: "/admin/locations",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                { type: "Locations", id: "LIST" },
                { type: "Locations", id: "ADMIN_LIST" },
            ],
        }),

        updateLocation: builder.mutation<LocationResponse, { id: string; body: UpdateLocationInput }>({
            query: ({ id, body }) => ({
                url: `/admin/locations/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_res, _err, { id }) => [
                { type: "Locations", id },
                { type: "Locations", id: "LIST" },
                { type: "Locations", id: "ADMIN_LIST" },
            ],
        }),

        deleteLocation: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/admin/locations/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_res, _err, id) => [
                { type: "Locations", id },
                { type: "Locations", id: "LIST" },
                { type: "Locations", id: "ADMIN_LIST" },
            ],
        }),

        bulkUploadLocations: builder.mutation<BulkLocationUploadResult, { csvContent: string; mode?: "UPSERT" | "REPLACE" }>({
            query: (body) => ({
                url: "/admin/locations/bulk-upload",
                method: "POST",
                body,
            }),
            invalidatesTags: [
                { type: "Locations", id: "LIST" },
                { type: "Locations", id: "ADMIN_LIST" },
            ],
        }),

        checkPincode: builder.mutation<CheckPincodeResponse, { pincode: string; countryCode?: string }>({
            query: (body) => ({
                url: "/locations/check-pincode",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useGetLocationsQuery,
    useGetAdminLocationsQuery,
    useGetLocationByIdQuery,
    useCreateLocationMutation,
    useUpdateLocationMutation,
    useDeleteLocationMutation,
    useBulkUploadLocationsMutation,
    useCheckPincodeMutation,
} = locationsApi;
