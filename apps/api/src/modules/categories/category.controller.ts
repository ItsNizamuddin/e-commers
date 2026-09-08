import { Request, Response, NextFunction } from "express";
import { AuditActions } from "@ecommers/types";
import { categoryService, CategoryService } from "./category.service.js";
import { auditLogService } from "../audit/audit-log.service.js";
import { CreateCategoryInput, UpdateCategoryInput, CategoryQueryOptions } from "./category.types.js";

export class CategoryController {
    constructor(private readonly service: CategoryService = categoryService) {}

    createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const input: CreateCategoryInput = req.body;
            const category = await this.service.createCategory(input, req.user?.id);

            void auditLogService.recordFromRequest(req, {
                action: AuditActions.CATEGORY_CREATED,
                target: {
                    resource: "category",
                    resourceId: category.id,
                    details: {
                        name: category.name,
                        slug: category.slug,
                    },
                },
            });

            res.status(201).json({
                success: true,
                message: "Category created successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    };

    getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const options: CategoryQueryOptions = req.query as unknown as CategoryQueryOptions;
            const result = await this.service.getCategories(options);
            res.status(200).json({
                success: true,
                data: result.data,
                meta: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                },
            });
        } catch (error) {
            next(error);
        }
    };

    getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const category = await this.service.getCategoryById(id as string);
            res.status(200).json({
                success: true,
                data: category,
            });
        } catch (error) {
            next(error);
        }
    };

    getCategoryBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { slug } = req.params;
            const category = await this.service.getCategoryBySlug(slug as string);
            res.status(200).json({
                success: true,
                data: category,
            });
        } catch (error) {
            next(error);
        }
    };

    updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const input: UpdateCategoryInput = req.body;
            const category = await this.service.updateCategory(id as string, input, req.user?.id);

            void auditLogService.recordFromRequest(req, {
                action: AuditActions.CATEGORY_UPDATED,
                target: {
                    resource: "category",
                    resourceId: id as string,
                    details: {
                        name: category.name,
                        updatedFields: Object.keys(input),
                    },
                },
            });

            res.status(200).json({
                success: true,
                message: "Category updated successfully",
                data: category,
            });
        } catch (error) {
            next(error);
        }
    };

    deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            await this.service.deleteCategory(id as string);

            void auditLogService.recordFromRequest(req, {
                action: AuditActions.CATEGORY_DELETED,
                target: {
                    resource: "category",
                    resourceId: id as string,
                },
            });

            res.status(200).json({
                success: true,
                message: "Category deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    };

    reorderCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { items } = req.body;
            const result = await this.service.reorderCategories(items, req.user?.id);

            void auditLogService.recordFromRequest(req, {
                action: AuditActions.CATEGORY_REORDERED,
                target: {
                    resource: "category",
                    details: {
                        count: items.length,
                        updatedCount: result.updatedCount,
                        categoryIds: items.map((i: { id: string }) => i.id),
                    },
                },
            });

            res.status(200).json({
                success: true,
                message: "Categories reordered successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const categoryController = new CategoryController();

