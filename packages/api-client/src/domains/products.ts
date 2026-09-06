import type { ApiClient } from "../client";
import type {
    ProductResponse,
    AdminProductResponse,
    CreateProductInput,
    UpdateProductInput,
    ProductQueryOptions,
    PublicVariantAvailabilityResponse,
} from "@ecommers/types";

export interface ProductListResponse {
    items: ProductResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class ProductsClient {
    constructor(private readonly client: ApiClient) {}

    async list(params?: ProductQueryOptions): Promise<ProductListResponse> {
        return this.client.get<ProductListResponse>("/products", { params });
    }

    async getById(id: string): Promise<ProductResponse> {
        return this.client.get<ProductResponse>(`/products/${id}`);
    }

    async getBySlug(slug: string): Promise<ProductResponse> {
        return this.client.get<ProductResponse>(`/products/slug/${slug}`);
    }

    async getAvailability(productId: string, variantId: string): Promise<PublicVariantAvailabilityResponse> {
        return this.client.get<PublicVariantAvailabilityResponse>(`/products/${productId}/variants/${variantId}/availability`);
    }

    async create(body: CreateProductInput): Promise<AdminProductResponse> {
        return this.client.post<AdminProductResponse>("/products", body);
    }

    async update(id: string, body: UpdateProductInput): Promise<AdminProductResponse> {
        return this.client.patch<AdminProductResponse>(`/products/${id}`, body);
    }

    async publish(id: string): Promise<ProductResponse> {
        return this.client.patch<ProductResponse>(`/products/${id}/publish`);
    }

    async delete(id: string): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>(`/products/${id}`);
    }
}
