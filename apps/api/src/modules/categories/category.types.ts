import { Types } from "mongoose";
import { ICategorySEO, AuditActor } from "@shopsphere/types";

export * from "@shopsphere/types";

export interface ICategory {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    parentId?: Types.ObjectId | null;
    ancestors: Types.ObjectId[];
    image?: string;
    isActive: boolean;
    sortOrder: number;
    seo?: ICategorySEO;
    metadata?: Record<string, unknown>;
    createdBy?: AuditActor;
    updatedBy?: AuditActor;
    createdAt: Date;
    updatedAt: Date;
}
