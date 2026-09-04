import { SeoMetadata } from "./seo.js";
import { AuditActor } from "./audit.js";

export type ICategorySEO = SeoMetadata;

export interface CategoryResponse {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parentId?: string | null;
    ancestors: string[];
    image?: string;
    isActive: boolean;
    sortOrder: number;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
    createdAt: string;
    updatedAt: string;
}

export interface CategoryTreeNode extends CategoryResponse {
    children: CategoryTreeNode[];
}

export interface CreateCategoryInput {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
    image?: string;
    isActive?: boolean;
    sortOrder?: number;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
}

export interface UpdateCategoryInput {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
    image?: string;
    isActive?: boolean;
    sortOrder?: number;
    seo?: SeoMetadata;
    metadata?: Record<string, unknown>;
}

export interface CategoryQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    parentId?: string | null;
    tree?: boolean;
}
