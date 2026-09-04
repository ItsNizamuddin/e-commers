import { Request, Response, NextFunction } from "express";
import { categoryService, CategoryService } from "./category.service.js";
import { CreateCategoryInput, UpdateCategoryInput, CategoryQueryOptions } from "./category.types.js";

export class CategoryController {
    constructor(private readonly service: CategoryService = categoryService) {}

    createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const input: CreateCategoryInput = req.body;
            const category = await this.service.createCategory(input, req.user?.id);
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
            res.status(200).json({
                success: true,
                message: "Category deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    };
}

export const categoryController = new CategoryController();
