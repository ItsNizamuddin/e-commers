import type { ApiClient } from "../client.js";
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput, CategoryQueryOptions } from "@ecommers/types";

export class CategoriesClient {
    constructor(private readonly client: ApiClient) {}

    async list(params?: CategoryQueryOptions): Promise<CategoryResponse[]> {
        return this.client.get<CategoryResponse[]>("/categories", { params });
    }

    async getById(id: string): Promise<CategoryResponse> {
        return this.client.get<CategoryResponse>(`/categories/${id}`);
    }

    async getBySlug(slug: string): Promise<CategoryResponse> {
        return this.client.get<CategoryResponse>(`/categories/slug/${slug}`);
    }

    async create(body: CreateCategoryInput): Promise<CategoryResponse> {
        return this.client.post<CategoryResponse>("/categories", body);
    }

    async update(id: string, body: UpdateCategoryInput): Promise<CategoryResponse> {
        return this.client.patch<CategoryResponse>(`/categories/${id}`, body);
    }

    async delete(id: string): Promise<{ message: string }> {
        return this.client.delete<{ message: string }>(`/categories/${id}`);
    }
}
