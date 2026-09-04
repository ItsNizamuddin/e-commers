import { Types, ClientSession } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { resolveActor } from "../../utils/audit.js";
import { withTransaction } from "../../database/transaction.js";
import { categoryRepository, CategoryRepository } from "./category.repository.js";
import { CategoryDocument } from "./category.model.js";
import {
    CategoryQueryOptions,
    CategoryResponse,
    CategoryTreeNode,
    CreateCategoryInput,
    UpdateCategoryInput,
} from "./category.types.js";

export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export class CategoryService {
    constructor(private readonly repo: CategoryRepository = categoryRepository) {}

    private toCategoryResponse(doc: CategoryDocument): CategoryResponse {
        return {
            id: doc._id.toString(),
            name: doc.name,
            slug: doc.slug,
            parentId: doc.parentId ? doc.parentId.toString() : null,
            ancestors: doc.ancestors.map((a) => a.toString()),
            isActive: doc.isActive,
            sortOrder: doc.sortOrder,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            ...(doc.description ? { description: doc.description } : {}),
            ...(doc.image ? { image: doc.image } : {}),
            ...(doc.seo ? { seo: doc.seo } : {}),
            ...(doc.metadata ? { metadata: doc.metadata as Record<string, unknown> } : {}),
            ...(doc.createdBy ? {
                createdBy: {
                    id: doc.createdBy.id,
                    name: doc.createdBy.name,
                    email: doc.createdBy.email,
                    role: doc.createdBy.role,
                },
            } : {}),
            ...(doc.updatedBy ? {
                updatedBy: {
                    id: doc.updatedBy.id,
                    name: doc.updatedBy.name,
                    email: doc.updatedBy.email,
                    role: doc.updatedBy.role,
                },
            } : {}),
        };
    }

    private async generateUniqueSlug(name: string, explicitSlug?: string, excludeId?: string): Promise<string> {
        const baseSlug = explicitSlug ? slugify(explicitSlug) : slugify(name);

        const existing = await this.repo.findBySlug(baseSlug);
        if (existing && existing._id.toString() !== excludeId) {
            if (explicitSlug) {
                throw new AppError(`Category with slug '${baseSlug}' already exists`, 409, "SLUG_ALREADY_EXISTS");
            }

            let counter = 1;
            while (true) {
                const candidate = `${baseSlug}-${counter}`;
                const check = await this.repo.findBySlug(candidate);
                if (!check || check._id.toString() === excludeId) {
                    return candidate;
                }
                counter++;
            }
        }

        return baseSlug;
    }

    async createCategory(input: CreateCategoryInput, actorUserId?: string): Promise<CategoryResponse> {
        const slug = await this.generateUniqueSlug(input.name, input.slug);

        let ancestors: Types.ObjectId[] = [];

        if (input.parentId) {
            const parent = await this.repo.findById(input.parentId);
            if (!parent) {
                throw new AppError("Parent category does not exist", 400, "INVALID_PARENT");
            }
            ancestors = [...parent.ancestors, parent._id as Types.ObjectId];
        }

        const actor = await resolveActor(actorUserId);

        const category = await this.repo.create({
            ...input,
            slug,
            ancestors,
            ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
        });

        return this.toCategoryResponse(category);
    }

    async getCategoryById(id: string): Promise<CategoryResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid category ID format", 400, "INVALID_ID");
        }

        const category = await this.repo.findById(id);
        if (!category) {
            throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        return this.toCategoryResponse(category);
    }

    async getCategoryBySlug(slug: string): Promise<CategoryResponse> {
        const category = await this.repo.findBySlug(slug);
        if (!category) {
            throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        return this.toCategoryResponse(category);
    }

    async getCategories(options: CategoryQueryOptions): Promise<{ data: CategoryResponse[] | CategoryTreeNode[]; total: number; page: number; limit: number }> {
        if (options.tree) {
            const allActive = await this.repo.findAllActive();
            const tree = this.buildTree(allActive);
            return {
                data: tree,
                total: allActive.length,
                page: 1,
                limit: allActive.length || 20,
            };
        }

        const { categories, total } = await this.repo.findPaginated(options);
        return {
            data: categories.map((c) => this.toCategoryResponse(c)),
            total,
            page: options.page || 1,
            limit: options.limit || 20,
        };
    }

    private buildTree(categories: CategoryDocument[]): CategoryTreeNode[] {
        const map = new Map<string, CategoryTreeNode>();
        const roots: CategoryTreeNode[] = [];

        for (const cat of categories) {
            const response = this.toCategoryResponse(cat);
            map.set(response.id, {
                ...response,
                children: [],
            });
        }

        for (const cat of categories) {
            const node = map.get(cat._id.toString())!;
            if (cat.parentId && map.has(cat.parentId.toString())) {
                const parentNode = map.get(cat.parentId.toString())!;
                parentNode.children.push(node);
            } else {
                roots.push(node);
            }
        }

        return roots;
    }

    async updateCategory(id: string, input: UpdateCategoryInput, actorUserId?: string): Promise<CategoryResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid category ID format", 400, "INVALID_ID");
        }

        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        let newSlug: string | undefined = undefined;
        if (input.slug !== undefined || input.name !== undefined) {
            newSlug = await this.generateUniqueSlug(
                input.name || existing.name,
                input.slug,
                id
            );
        }

        let newAncestors: Types.ObjectId[] | undefined = undefined;

        if (input.parentId !== undefined) {
            if (input.parentId === id) {
                throw new AppError("A category cannot be its own parent", 400, "INVALID_PARENT");
            }

            if (input.parentId === null) {
                newAncestors = [];
            } else {
                const newParent = await this.repo.findById(input.parentId);
                if (!newParent) {
                    throw new AppError("Parent category does not exist", 400, "INVALID_PARENT");
                }

                const isCircular = newParent.ancestors.some((ancId) => ancId.toString() === id);
                if (isCircular) {
                    throw new AppError("Circular parent relationship detected", 400, "CIRCULAR_DEPENDENCY");
                }

                newAncestors = [...newParent.ancestors, newParent._id as Types.ObjectId];
            }
        }

        const actor = await resolveActor(actorUserId);

        if (newAncestors !== undefined) {
            // Multi-document write operation: Category relocation + descendant ancestor tree recalculation
            // Must execute atomically within a MongoDB session/transaction to prevent tree corruption
            const updated = await withTransaction(async (session) => {
                const updatedDoc = await this.repo.update(
                    id,
                    {
                        ...input,
                        ...(newSlug && { slug: newSlug }),
                        ancestors: newAncestors,
                        ...(actor ? { updatedBy: actor } : {}),
                    },
                    session
                );

                if (!updatedDoc) {
                    throw new AppError("Category update failed", 400, "UPDATE_FAILED");
                }

                await this.syncDescendantAncestors(id, newAncestors, session);
                return updatedDoc;
            });

            return this.toCategoryResponse(updated);
        }

        // Single-document update (name, description, image, seo, metadata, etc.):
        // Relies directly on MongoDB document-level atomicity without transaction overhead
        const updated = await this.repo.update(id, {
            ...input,
            ...(newSlug && { slug: newSlug }),
            ...(actor ? { updatedBy: actor } : {}),
        });

        if (!updated) {
            throw new AppError("Category update failed", 400, "UPDATE_FAILED");
        }

        return this.toCategoryResponse(updated);
    }

    private async syncDescendantAncestors(
        parentId: string,
        parentAncestors: Types.ObjectId[],
        session?: ClientSession
    ): Promise<void> {
        const parentObjectId = new Types.ObjectId(parentId);
        const newBaseAncestors = [...parentAncestors, parentObjectId];

        const descendants = await this.repo.findDescendants(parentId, session);
        for (const desc of descendants) {
            const parentIndex = desc.ancestors.findIndex((a) => a.equals(parentObjectId));
            if (parentIndex !== -1) {
                const suffix = desc.ancestors.slice(parentIndex + 1);
                const updatedAncestors = [...newBaseAncestors, ...suffix];
                await this.repo.update(desc._id, { ancestors: updatedAncestors }, session);
            }
        }
    }

    async deleteCategory(id: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid category ID format", 400, "INVALID_ID");
        }

        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        const hasChildren = await this.repo.hasChildren(id);
        if (hasChildren) {
            throw new AppError("Cannot delete category with active subcategories", 400, "HAS_SUBCATEGORIES");
        }

        await this.repo.delete(id);
    }
}

export const categoryService = new CategoryService();
