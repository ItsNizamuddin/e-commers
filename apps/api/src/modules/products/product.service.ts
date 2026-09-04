import { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { resolveActor } from "../../utils/audit.js";
import { categoryRepository } from "../categories/category.repository.js";
import { productRepository, ProductRepository } from "./product.repository.js";
import { ProductDocument } from "./product.model.js";
import {
    ProductResponse,
    AdminProductResponse,
    ProductVariantResponse,
    AdminProductVariantResponse,
    CreateProductInput,
    UpdateProductInput,
    ProductQueryOptions,
} from "./product.types.js";

export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export class ProductService {
    constructor(private readonly repo: ProductRepository = productRepository) {}

    toProductResponse(doc: ProductDocument, isStaff: boolean): ProductResponse | AdminProductResponse {
        const publicVariants: ProductVariantResponse[] = doc.variants.map((v) => ({
            id: v.id || doc._id.toString(),
            sku: v.sku,
            title: v.title,
            prices: v.prices.map((p) => ({
                currency: p.currency,
                amount: p.amount,
                ...(p.compareAtAmount !== undefined ? { compareAtAmount: p.compareAtAmount } : {}),
            })),
            ...(v.barcode ? { barcode: v.barcode } : {}),
            ...(v.weight !== undefined ? { weight: v.weight } : {}),
            ...(v.weightUnit ? { weightUnit: v.weightUnit } : {}),
            ...(v.attributes ? { attributes: v.attributes as Record<string, unknown> } : {}),
            isActive: v.isActive ?? true,
        }));

        const baseResponse: ProductResponse = {
            id: doc._id.toString(),
            title: doc.title,
            slug: doc.slug,
            categoryId: doc.categoryId.toString(),
            baseCurrency: doc.baseCurrency,
            variants: publicVariants,
            images: doc.images,
            tags: doc.tags,
            status: doc.status,
            version: doc.version,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            ...(doc.description ? { description: doc.description } : {}),
            ...(doc.shortDescription ? { shortDescription: doc.shortDescription } : {}),
            ...(doc.brand ? { brand: doc.brand } : {}),
            ...(doc.thumbnail ? { thumbnail: doc.thumbnail } : {}),
            ...(doc.nutritionInfo ? { nutritionInfo: doc.nutritionInfo } : {}),
            ...(doc.allergens ? { allergens: doc.allergens } : {}),
            ...(doc.storageInstructions ? { storageInstructions: doc.storageInstructions } : {}),
            ...(doc.seo ? { seo: doc.seo } : {}),
            ...(doc.metadata ? { metadata: doc.metadata as Record<string, unknown> } : {}),
            ...(doc.createdBy ? { createdBy: doc.createdBy } : {}),
            ...(doc.updatedBy ? { updatedBy: doc.updatedBy } : {}),
        };

        if (!isStaff) {
            return baseResponse;
        }

        const adminVariants: AdminProductVariantResponse[] = doc.variants.map((v) => ({
            id: v.id || doc._id.toString(),
            sku: v.sku,
            title: v.title,
            prices: v.prices.map((p) => ({
                currency: p.currency,
                amount: p.amount,
                ...(p.compareAtAmount !== undefined ? { compareAtAmount: p.compareAtAmount } : {}),
                ...(p.costAmount !== undefined ? { costAmount: p.costAmount } : {}),
            })),
            ...(v.barcode ? { barcode: v.barcode } : {}),
            ...(v.weight !== undefined ? { weight: v.weight } : {}),
            ...(v.weightUnit ? { weightUnit: v.weightUnit } : {}),
            ...(v.attributes ? { attributes: v.attributes as Record<string, unknown> } : {}),
            isActive: v.isActive ?? true,
        }));

        return {
            ...baseResponse,
            variants: adminVariants,
        };
    }

    private async generateUniqueSlug(title: string, explicitSlug?: string, excludeId?: string): Promise<string> {
        const baseSlug = explicitSlug ? slugify(explicitSlug) : slugify(title);

        const existing = await this.repo.findBySlug(baseSlug);
        if (existing && existing._id.toString() !== excludeId) {
            if (explicitSlug) {
                throw new AppError(`Product with slug '${baseSlug}' already exists`, 409, "SLUG_ALREADY_EXISTS");
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

    async createProduct(input: CreateProductInput, actorUserId?: string): Promise<AdminProductResponse> {
        if (!Types.ObjectId.isValid(input.categoryId)) {
            throw new AppError("Invalid category ID format", 400, "INVALID_CATEGORY");
        }

        const category = await categoryRepository.findById(input.categoryId);
        if (!category || !category.isActive) {
            throw new AppError("Category does not exist or is inactive", 400, "INVALID_CATEGORY");
        }

        for (const variant of input.variants) {
            const normalizedSku = variant.sku.trim().toUpperCase();
            const existingWithSku = await this.repo.findBySku(normalizedSku);
            if (existingWithSku) {
                throw new AppError(`Product with SKU '${normalizedSku}' already exists`, 409, "SKU_ALREADY_EXISTS");
            }
        }

        let candidateSlug = await this.generateUniqueSlug(input.title, input.slug);
        const actor = await resolveActor(actorUserId);

        let product: ProductDocument | undefined;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                product = await this.repo.create({
                    ...input,
                    slug: candidateSlug,
                    ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
                });
                break;
            } catch (error: any) {
                if (input.slug) {
                    throw error;
                }

                const isDuplicateSlug =
                    error?.code === 11000 &&
                    (error?.keyPattern?.slug || error?.message?.includes("index: slug_1") || error?.message?.includes("dup key: { slug"));

                if (isDuplicateSlug) {
                    attempts++;
                    const baseSlug = slugify(input.title);
                    candidateSlug = `${baseSlug}-${attempts}`;
                    continue;
                }

                throw error;
            }
        }

        if (!product) {
            throw new AppError("Failed to generate a unique product slug", 500, "SLUG_GENERATION_FAILED");
        }

        return this.toProductResponse(product, true) as AdminProductResponse;
    }

    async getProducts(
        options: ProductQueryOptions,
        isStaff: boolean
    ): Promise<{ data: (ProductResponse | AdminProductResponse)[]; total: number; page: number; limit: number }> {
        const queryOptions: ProductQueryOptions = { ...options };

        if (!isStaff) {
            queryOptions.status = "PUBLISHED";
        }

        let categoryIds: string[] | undefined = undefined;
        if (queryOptions.categoryId) {
            if (!Types.ObjectId.isValid(queryOptions.categoryId)) {
                throw new AppError("Invalid category ID format", 400, "INVALID_ID");
            }
            const descendants = await categoryRepository.findDescendants(queryOptions.categoryId);
            categoryIds = [queryOptions.categoryId, ...descendants.map((d) => d._id.toString())];
        }

        const { products, total } = await this.repo.findPaginated(queryOptions, categoryIds);

        return {
            data: products.map((p) => this.toProductResponse(p, isStaff)),
            total,
            page: queryOptions.page || 1,
            limit: queryOptions.limit || 20,
        };
    }

    async getProductById(id: string, isStaff: boolean): Promise<ProductResponse | AdminProductResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid product ID format", 400, "INVALID_ID");
        }

        const product = await this.repo.findById(id);
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        if (!isStaff && product.status !== "PUBLISHED") {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        return this.toProductResponse(product, isStaff);
    }

    async getProductBySlug(slug: string, isStaff: boolean): Promise<ProductResponse | AdminProductResponse> {
        const product = await this.repo.findBySlug(slug);
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        if (!isStaff && product.status !== "PUBLISHED") {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        return this.toProductResponse(product, isStaff);
    }

    async updateProduct(id: string, input: UpdateProductInput, actorUserId?: string): Promise<AdminProductResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid product ID format", 400, "INVALID_ID");
        }

        const existing = await this.repo.findById(id);
        if (!existing) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        if (input.categoryId !== undefined) {
            if (!Types.ObjectId.isValid(input.categoryId)) {
                throw new AppError("Invalid category ID format", 400, "INVALID_CATEGORY");
            }
            const category = await categoryRepository.findById(input.categoryId);
            if (!category || !category.isActive) {
                throw new AppError("Category does not exist or is inactive", 400, "INVALID_CATEGORY");
            }
        }

        if (input.variants !== undefined) {
            for (const variant of input.variants) {
                const normalizedSku = variant.sku.trim().toUpperCase();
                const existingWithSku = await this.repo.findBySku(normalizedSku);
                if (existingWithSku && existingWithSku._id.toString() !== id) {
                    throw new AppError(`Product with SKU '${normalizedSku}' already exists`, 409, "SKU_ALREADY_EXISTS");
                }
            }
        }

        let newSlug: string | undefined = undefined;
        if (input.slug !== undefined || input.title !== undefined) {
            newSlug = await this.generateUniqueSlug(
                input.title || existing.title,
                input.slug,
                id
            );
        }

        const actor = await resolveActor(actorUserId);

        let updated: ProductDocument | null = null;
        if (input.expectedVersion !== undefined) {
            updated = await this.repo.updateWithVersion(
                id,
                input.expectedVersion,
                {
                    ...input,
                    ...(newSlug && { slug: newSlug }),
                    ...(actor ? { updatedBy: actor } : {}),
                }
            );
            if (!updated) {
                throw new AppError(
                    "Product has been modified by another user. Please refresh and try again.",
                    409,
                    "RESOURCE_VERSION_CONFLICT"
                );
            }
        } else {
            updated = await this.repo.update(id, {
                ...input,
                ...(newSlug && { slug: newSlug }),
                ...(actor ? { updatedBy: actor } : {}),
            });
            if (!updated) {
                throw new AppError("Product update failed", 400, "UPDATE_FAILED");
            }
        }

        return this.toProductResponse(updated, true) as AdminProductResponse;
    }

    async publishProduct(id: string, actorUserId?: string): Promise<AdminProductResponse> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid product ID format", 400, "INVALID_ID");
        }

        const product = await this.repo.findById(id);
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        if (product.status === "ARCHIVED") {
            throw new AppError("Cannot publish an archived product. Please restore it first.", 400, "INVALID_STATE_TRANSITION");
        }

        const category = await categoryRepository.findById(product.categoryId);
        if (!category || !category.isActive) {
            throw new AppError("Cannot publish product with invalid or inactive category", 400, "INVALID_CATEGORY");
        }

        const activeVariants = product.variants.filter((v) => v.isActive !== false);
        if (activeVariants.length === 0) {
            throw new AppError("Cannot publish product with no active variants", 400, "NO_ACTIVE_VARIANTS");
        }

        for (const variant of activeVariants) {
            const basePrice = variant.prices.find((p) => p.currency === product.baseCurrency);
            if (!basePrice || basePrice.amount <= 0) {
                throw new AppError(
                    `Variant '${variant.title}' must have a base price greater than 0 to publish`,
                    400,
                    "INVALID_PRICE"
                );
            }
        }

        const actor = await resolveActor(actorUserId);

        const updated = await this.repo.update(id, {
            status: "PUBLISHED",
            ...(actor ? { updatedBy: actor } : {}),
        });

        if (!updated) {
            throw new AppError("Publishing product failed", 400, "PUBLISH_FAILED");
        }

        return this.toProductResponse(updated, true) as AdminProductResponse;
    }

    async deleteProduct(id: string, actorUserId?: string): Promise<void> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid product ID format", 400, "INVALID_ID");
        }

        const product = await this.repo.findById(id);
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        const actor = await resolveActor(actorUserId);
        await this.repo.update(id, {
            status: "ARCHIVED",
            ...(actor ? { updatedBy: actor } : {}),
        });
    }
}

export const productService = new ProductService();
