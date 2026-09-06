import { Types } from "mongoose";
import { ICategorySEO, AuditActor } from "@ecommers/types";

export * from "@ecommers/types";

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
