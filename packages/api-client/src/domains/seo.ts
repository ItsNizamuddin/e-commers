import type { ApiClient } from "../client";
import type {
    IEntitySeo,
    BulkSeoUploadResult,
    SeoEntityType,
    LocationSeoOverride,
} from "@ecommers/types";

export class SeoClient {
    constructor(private readonly client: ApiClient) {}

    async get(entityType: SeoEntityType, entityId: string): Promise<IEntitySeo | null> {
        return this.client.get<IEntitySeo | null>(`/seo/${entityType}/${entityId}`);
    }

    async upsert(
        entityType: SeoEntityType,
        entityId: string,
        body: {
            entityTitle?: string;
            entitySlug?: string;
            global?: Record<string, any>;
            locations?: LocationSeoOverride[];
        }
    ): Promise<IEntitySeo> {
        return this.client.put<IEntitySeo>(`/admin/seo/${entityType}/${entityId}`, body);
    }

    async exportCsv(entityType: SeoEntityType = "PRODUCT", fields?: string[]): Promise<string> {
        return this.client.get<string>("/admin/seo/export", {
            params: {
                entityType,
                ...(fields && fields.length > 0 ? { fields: fields.join(",") } : {}),
            },
        });
    }

    async importCsv(csvContent: string): Promise<BulkSeoUploadResult> {
        return this.client.post<BulkSeoUploadResult>("/admin/seo/import", { csvContent, mode: "UPSERT" });
    }

    async autoFill(
        entityType: SeoEntityType,
        entityId: string,
        options?: { titleTemplate?: string; descTemplate?: string; badgeTemplate?: string }
    ): Promise<IEntitySeo> {
        return this.client.post<IEntitySeo>("/admin/seo/auto-fill", {
            entityType,
            entityId,
            ...options,
        });
    }

    async listEntities(entityType: SeoEntityType = "PRODUCT", search?: string): Promise<Array<{ id: string; title: string; slug: string; status?: string }>> {
        return this.client.get<Array<{ id: string; title: string; slug: string; status?: string }>>("/admin/seo/entities", {
            params: { entityType, ...(search ? { search } : {}) },
        });
    }

    async getMetadataRows(
        entityType: SeoEntityType,
        entityId: string,
        search?: string
    ): Promise<{
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
    }> {
        return this.client.get("/admin/seo/metadata-rows", {
            params: { entityType, entityId, ...(search ? { search } : {}) },
        });
    }

    async updateRow(
        entityType: SeoEntityType,
        entityId: string,
        locationKey: string,
        data: Record<string, any>
    ): Promise<any> {
        return this.client.patch(`/admin/seo/row/${entityType}/${entityId}/${locationKey}`, data);
    }
}
