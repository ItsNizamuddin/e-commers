import { Types, ClientSession } from "mongoose";
import { AuditActor } from "@shopsphere/types";
import { CategoryModel, CategoryDocument } from "./category.model.js";
import { CategoryQueryOptions, CreateCategoryInput, UpdateCategoryInput } from "./category.types.js";

export class CategoryRepository {
    async create(
        data: CreateCategoryInput & {
            slug: string;
            ancestors: Types.ObjectId[];
            createdBy?: AuditActor | undefined;
            updatedBy?: AuditActor | undefined;
        },
        session?: ClientSession
    ): Promise<CategoryDocument> {
        const categoryData = {
            name: data.name,
            slug: data.slug,
            ancestors: data.ancestors,
            isActive: data.isActive ?? true,
            sortOrder: data.sortOrder ?? 0,
            parentId: data.parentId ? new Types.ObjectId(data.parentId) : null,
            ...(data.description ? { description: data.description } : {}),
            ...(data.image ? { image: data.image } : {}),
            ...(data.seo ? { seo: data.seo } : {}),
            ...(data.metadata ? { metadata: data.metadata } : {}),
            ...(data.createdBy ? { createdBy: data.createdBy } : {}),
            ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
        };

        const doc = new CategoryModel(categoryData);
        await doc.save(session ? { session } : undefined);
        return doc;
    }

    async findById(id: string | Types.ObjectId, session?: ClientSession): Promise<CategoryDocument | null> {
        return await CategoryModel.findById(id).session(session ?? null).exec();
    }

    async findBySlug(slug: string): Promise<CategoryDocument | null> {
        return await CategoryModel.findOne({ slug: slug.toLowerCase() });
    }

    async findPaginated(options: CategoryQueryOptions): Promise<{ categories: CategoryDocument[]; total: number }> {
        const { page = 1, limit = 20, search, isActive, parentId } = options;

        const filter: Record<string, unknown> = {};

        if (typeof isActive === "boolean") {
            filter.isActive = isActive;
        }

        if (parentId !== undefined) {
            filter.parentId = parentId === "null" || parentId === null ? null : new Types.ObjectId(parentId);
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { slug: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const [categories, total] = await Promise.all([
            CategoryModel.find(filter)
                .sort({ parentId: 1, sortOrder: 1, name: 1 })
                .skip(skip)
                .limit(limit),
            CategoryModel.countDocuments(filter),
        ]);

        return { categories, total };
    }

    async findAllActive(): Promise<CategoryDocument[]> {
        return await CategoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    }

    async update(
        id: string | Types.ObjectId,
        data: UpdateCategoryInput & {
            ancestors?: Types.ObjectId[];
            updatedBy?: AuditActor | undefined;
        },
        session?: ClientSession
    ): Promise<CategoryDocument | null> {
        const updateFields: Record<string, unknown> = {};

        if (data.name !== undefined) updateFields.name = data.name;
        if (data.slug !== undefined) updateFields.slug = data.slug.toLowerCase();
        if (data.description !== undefined) updateFields.description = data.description;
        if (data.parentId !== undefined) updateFields.parentId = data.parentId ? new Types.ObjectId(data.parentId) : null;
        if (data.ancestors !== undefined) updateFields.ancestors = data.ancestors;
        if (data.image !== undefined) updateFields.image = data.image;
        if (data.isActive !== undefined) updateFields.isActive = data.isActive;
        if (data.sortOrder !== undefined) updateFields.sortOrder = data.sortOrder;
        if (data.seo !== undefined) updateFields.seo = data.seo;
        if (data.metadata !== undefined) updateFields.metadata = data.metadata;
        if (data.updatedBy !== undefined) updateFields.updatedBy = data.updatedBy;

        return await CategoryModel.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true, ...(session ? { session } : {}) }
        ).exec();
    }

    async delete(id: string | Types.ObjectId, session?: ClientSession): Promise<CategoryDocument | null> {
        return await CategoryModel.findByIdAndDelete(
            id,
            session ? { session } : undefined
        ).exec();
    }

    async hasChildren(id: string | Types.ObjectId): Promise<boolean> {
        const count = await CategoryModel.countDocuments({ parentId: new Types.ObjectId(id) });
        return count > 0;
    }

    async findDescendants(id: string | Types.ObjectId, session?: ClientSession): Promise<CategoryDocument[]> {
        return await CategoryModel.find({ ancestors: new Types.ObjectId(id) }).session(session ?? null).exec();
    }
}

export const categoryRepository = new CategoryRepository();
