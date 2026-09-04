import { Schema, model, models, Model, Document } from "mongoose";
import { ICategory } from "./category.types.js";
import { SeoSchema } from "../../database/schemas/seo.schema.js";
import { AuditActorSchema } from "../../database/schemas/audit-actor.schema.js";

export interface CategoryDocument extends Omit<ICategory, "_id">, Document {}

const CategorySchema = new Schema<CategoryDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            default: null,
            index: true,
        },
        ancestors: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
                index: true,
            },
        ],
        image: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },
        seo: {
            type: SeoSchema,
            default: undefined,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
        createdBy: {
            type: AuditActorSchema,
            default: undefined,
        },
        updatedBy: {
            type: AuditActorSchema,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ name: "text", description: "text" });

export const CategoryModel =
    (models.Category as Model<CategoryDocument>) || model<CategoryDocument>("Category", CategorySchema);
