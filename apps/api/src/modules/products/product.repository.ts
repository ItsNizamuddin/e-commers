import { Types, ClientSession } from "mongoose";
import { AuditActor } from "@shopsphere/types";
import { ProductModel, ProductDocument } from "./product.model.js";
import {
    CreateProductInput,
    UpdateProductInput,
    ProductQueryOptions,
} from "./product.types.js";

export class ProductRepository {
    async create(
        data: CreateProductInput & {
            slug: string;
            createdBy?: AuditActor | undefined;
            updatedBy?: AuditActor | undefined;
        },
        session?: ClientSession
    ): Promise<ProductDocument> {
        const productData = {
            title: data.title,
            slug: data.slug,
            description: data.description,
            shortDescription: data.shortDescription,
            brand: data.brand,
            categoryId: new Types.ObjectId(data.categoryId),
            baseCurrency: data.baseCurrency || "USD",
            variants: data.variants,
            images: data.images || [],
            thumbnail: data.thumbnail,
            tags: data.tags || [],
            status: data.status || "DRAFT",
            version: 1,
            ...(data.nutritionInfo ? { nutritionInfo: data.nutritionInfo } : {}),
            ...(data.allergens ? { allergens: data.allergens } : {}),
            ...(data.storageInstructions ? { storageInstructions: data.storageInstructions } : {}),
            ...(data.seo ? { seo: data.seo } : {}),
            ...(data.metadata ? { metadata: data.metadata } : {}),
            ...(data.createdBy ? { createdBy: data.createdBy } : {}),
            ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
        };

        const doc = new ProductModel(productData);
        await doc.save(session ? { session } : undefined);
        return doc;
    }

    async findById(id: string | Types.ObjectId, session?: ClientSession): Promise<ProductDocument | null> {
        return await ProductModel.findById(id).session(session ?? null).exec();
    }

    async findBySlug(slug: string, session?: ClientSession): Promise<ProductDocument | null> {
        return await ProductModel.findOne({ slug: slug.toLowerCase() }).session(session ?? null).exec();
    }

    async findBySku(sku: string, session?: ClientSession): Promise<ProductDocument | null> {
        return await ProductModel.findOne({ "variants.sku": sku.trim().toUpperCase() })
            .session(session ?? null)
            .exec();
    }

    async findPaginated(
        options: ProductQueryOptions,
        categoryIds?: string[]
    ): Promise<{ products: ProductDocument[]; total: number }> {
        const {
            page = 1,
            limit = 20,
            search,
            status,
            brand,
            currency,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder = "asc",
        } = options;

        const filter: Record<string, unknown> = {};

        if (status) {
            filter.status = status;
        }

        if (brand) {
            filter.brand = { $regex: brand, $options: "i" };
        }

        if (categoryIds && categoryIds.length > 0) {
            filter.categoryId = { $in: categoryIds.map((id) => new Types.ObjectId(id)) };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            const priceElemMatch: Record<string, unknown> = {};
            if (currency) {
                priceElemMatch.currency = currency;
            }
            const amountFilter: Record<string, unknown> = {};
            if (minPrice !== undefined) amountFilter.$gte = minPrice;
            if (maxPrice !== undefined) amountFilter.$lte = maxPrice;
            priceElemMatch.amount = amountFilter;
            filter["variants.prices"] = { $elemMatch: priceElemMatch };
        }

        if (search) {
            filter.$text = { $search: search };
        }

        const sort: Record<string, 1 | -1> = {};
        if (sortBy === "title") {
            sort.title = sortOrder === "desc" ? -1 : 1;
        } else if (sortBy === "price") {
            sort["variants.prices.amount"] = sortOrder === "desc" ? -1 : 1;
        } else {
            sort.createdAt = -1;
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            ProductModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
            ProductModel.countDocuments(filter).exec(),
        ]);

        return { products, total };
    }

    async updateWithVersion(
        id: string | Types.ObjectId,
        expectedVersion: number,
        data: UpdateProductInput & {
            updatedBy?: AuditActor | undefined;
        },
        session?: ClientSession
    ): Promise<ProductDocument | null> {
        const updateFields: Record<string, unknown> = {};

        if (data.title !== undefined) updateFields.title = data.title;
        if (data.slug !== undefined) updateFields.slug = data.slug.toLowerCase();
        if (data.description !== undefined) updateFields.description = data.description;
        if (data.shortDescription !== undefined) updateFields.shortDescription = data.shortDescription;
        if (data.brand !== undefined) updateFields.brand = data.brand;
        if (data.categoryId !== undefined) updateFields.categoryId = new Types.ObjectId(data.categoryId);
        if (data.baseCurrency !== undefined) updateFields.baseCurrency = data.baseCurrency;
        if (data.variants !== undefined) updateFields.variants = data.variants;
        if (data.images !== undefined) updateFields.images = data.images;
        if (data.thumbnail !== undefined) updateFields.thumbnail = data.thumbnail;
        if (data.tags !== undefined) updateFields.tags = data.tags;
        if (data.status !== undefined) updateFields.status = data.status;
        if (data.nutritionInfo !== undefined) updateFields.nutritionInfo = data.nutritionInfo;
        if (data.allergens !== undefined) updateFields.allergens = data.allergens;
        if (data.storageInstructions !== undefined) updateFields.storageInstructions = data.storageInstructions;
        if (data.seo !== undefined) updateFields.seo = data.seo;
        if (data.metadata !== undefined) updateFields.metadata = data.metadata;
        if (data.updatedBy !== undefined) updateFields.updatedBy = data.updatedBy;

        return await ProductModel.findOneAndUpdate(
            { _id: id, version: expectedVersion },
            { $set: updateFields, $inc: { version: 1 } },
            { new: true, runValidators: true, ...(session ? { session } : {}) }
        ).exec();
    }

    async update(
        id: string | Types.ObjectId,
        data: UpdateProductInput & {
            updatedBy?: AuditActor | undefined;
        },
        session?: ClientSession
    ): Promise<ProductDocument | null> {
        const updateFields: Record<string, unknown> = {};

        if (data.title !== undefined) updateFields.title = data.title;
        if (data.slug !== undefined) updateFields.slug = data.slug.toLowerCase();
        if (data.description !== undefined) updateFields.description = data.description;
        if (data.shortDescription !== undefined) updateFields.shortDescription = data.shortDescription;
        if (data.brand !== undefined) updateFields.brand = data.brand;
        if (data.categoryId !== undefined) updateFields.categoryId = new Types.ObjectId(data.categoryId);
        if (data.baseCurrency !== undefined) updateFields.baseCurrency = data.baseCurrency;
        if (data.variants !== undefined) updateFields.variants = data.variants;
        if (data.images !== undefined) updateFields.images = data.images;
        if (data.thumbnail !== undefined) updateFields.thumbnail = data.thumbnail;
        if (data.tags !== undefined) updateFields.tags = data.tags;
        if (data.status !== undefined) updateFields.status = data.status;
        if (data.nutritionInfo !== undefined) updateFields.nutritionInfo = data.nutritionInfo;
        if (data.allergens !== undefined) updateFields.allergens = data.allergens;
        if (data.storageInstructions !== undefined) updateFields.storageInstructions = data.storageInstructions;
        if (data.seo !== undefined) updateFields.seo = data.seo;
        if (data.metadata !== undefined) updateFields.metadata = data.metadata;
        if (data.updatedBy !== undefined) updateFields.updatedBy = data.updatedBy;

        return await ProductModel.findByIdAndUpdate(
            id,
            { $set: updateFields, $inc: { version: 1 } },
            { new: true, runValidators: true, ...(session ? { session } : {}) }
        ).exec();
    }

    async archive(id: string | Types.ObjectId, session?: ClientSession): Promise<ProductDocument | null> {
        return await ProductModel.findByIdAndUpdate(
            id,
            { $set: { status: "ARCHIVED" }, $inc: { version: 1 } },
            { new: true, ...(session ? { session } : {}) }
        ).exec();
    }
}

export const productRepository = new ProductRepository();
