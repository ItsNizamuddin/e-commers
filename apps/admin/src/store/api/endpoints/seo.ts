import { adminApi } from "../admin-api";
import type {
    IEntitySeo,
    BulkSeoUploadResult,
    SeoEntityType,
    LocationSeoOverride,
} from "@ecommers/types";

export interface SeoMetadataRowsResult {
    entity: { id: string; title: string; slug: string; type: SeoEntityType };
    rows: Array<{
        id: string;
        locationKey: string;
        locationName: string;
        locationType: string;
        currency?: string;
        slug: string;
        robots: string;
        updatedAt: string | Date;
        metaTitle?: string;
        metaDescription?: string;
        deliveryHighlight?: string;
        canonicalUrl?: string;
        keywords?: string[];
        isIndexed?: boolean;
        ogTitle?: string;
        ogDescription?: string;
        ogImage?: string;
        internalSection?: { title?: string; value?: string };
        bottomSection?: { title?: string; value?: string };
    }>;
    total: number;
}

export const seoApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getSeo: builder.query<IEntitySeo | null, { entityType: SeoEntityType; entityId: string }>({
            query: ({ entityType, entityId }) => ({
                url: `/seo/${entityType}/${entityId}`,
                method: "GET",
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: (_res, _err, { entityType, entityId }) => [
                { type: "Seo", id: `${entityType}_${entityId}` },
                { type: "Seo", id: "LIST" },
            ],
        }),

        upsertSeo: builder.mutation<
            IEntitySeo,
            {
                entityType: SeoEntityType;
                entityId: string;
                body: {
                    entityTitle?: string;
                    entitySlug?: string;
                    global?: Record<string, any>;
                    locations?: LocationSeoOverride[];
                };
            }
        >({
            query: ({ entityType, entityId, body }) => ({
                url: `/admin/seo/${entityType}/${entityId}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_res, _err, { entityType, entityId }) => [
                { type: "Seo", id: `${entityType}_${entityId}` },
                { type: "Seo", id: "LIST" },
            ],
        }),

        listSeoEntities: builder.query<Array<{ id: string; title: string; slug: string; status?: string }>, { entityType?: SeoEntityType; search?: string } | void>({
            query: (params) => ({
                url: "/admin/seo/entities",
                method: "GET",
                params: params ? { entityType: params.entityType || "PRODUCT", ...(params.search ? { search: params.search } : {}) } : { entityType: "PRODUCT" },
            }),
            transformResponse: (response: any) => {
                const items = Array.isArray(response) ? response : response?.data || response?.items || [];
                return Array.isArray(items) ? [...items] : [];
            },
            providesTags: [{ type: "Seo", id: "ENTITIES" }],
        }),

        getSeoMetadataRows: builder.query<SeoMetadataRowsResult, { entityType: SeoEntityType; entityId: string; search?: string }>({
            query: ({ entityType, entityId, search }) => ({
                url: "/admin/seo/metadata-rows",
                method: "GET",
                params: { entityType, entityId, ...(search ? { search } : {}) },
            }),
            transformResponse: (response: any) => {
                const entity = response?.entity || { id: "", title: "", slug: "", type: "PRODUCT" };
                const rows = Array.isArray(response?.rows) ? [...response.rows] : [];
                const total = Number(response?.total ?? rows.length) || 0;
                return { entity, rows, total };
            },
            providesTags: (_res, _err, { entityType, entityId }) => [
                { type: "Seo", id: `ROWS_${entityType}_${entityId}` },
            ],
        }),

        updateSeoRow: builder.mutation<any, { entityType: SeoEntityType; entityId: string; locationKey: string; data: Record<string, any> }>({
            query: ({ entityType, entityId, locationKey, data }) => ({
                url: `/admin/seo/row/${entityType}/${entityId}/${locationKey}`,
                method: "PATCH",
                body: data,
            }),
            invalidatesTags: (_res, _err, { entityType, entityId }) => [
                { type: "Seo", id: `ROWS_${entityType}_${entityId}` },
                { type: "Seo", id: `${entityType}_${entityId}` },
            ],
        }),

        importSeoCsv: builder.mutation<BulkSeoUploadResult, { csvContent: string }>({
            query: ({ csvContent }) => ({
                url: "/admin/seo/import",
                method: "POST",
                body: { csvContent, mode: "UPSERT" },
            }),
            invalidatesTags: [{ type: "Seo", id: "LIST" }],
        }),

        exportSeoCsv: builder.mutation<string, { entityType: SeoEntityType; fields?: string[] }>({
            query: ({ entityType, fields }) => ({
                url: "/admin/seo/export",
                method: "GET",
                params: {
                    entityType,
                    ...(fields && fields.length > 0 ? { fields: fields.join(",") } : {}),
                },
            }),
        }),
    }),
});

export const {
    useGetSeoQuery,
    useUpsertSeoMutation,
    useListSeoEntitiesQuery,
    useGetSeoMetadataRowsQuery,
    useUpdateSeoRowMutation,
    useImportSeoCsvMutation,
    useExportSeoCsvMutation,
} = seoApi;
