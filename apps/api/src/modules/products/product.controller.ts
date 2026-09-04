import { Request, Response, NextFunction } from "express";
import { STAFF_ROLES } from "@shopsphere/types";
import { productService, ProductService } from "./product.service.js";
import {
    CreateProductInput,
    UpdateProductInput,
    ProductQueryOptions,
} from "./product.types.js";

export class ProductController {
    constructor(private readonly service: ProductService = productService) {}

    private isStaff(req: Request): boolean {
        return Boolean(req.user && STAFF_ROLES.includes(req.user.role));
    }

    createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const input: CreateProductInput = req.body;
            const product = await this.service.createProduct(input, req.user?.id);
            res.status(201).json({
                success: true,
                message: "Product created successfully",
                data: product,
            });
        } catch (error) {
            next(error);
        }
    };

    getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const options: ProductQueryOptions = req.query as unknown as ProductQueryOptions;
            const isStaff = this.isStaff(req);
            const result = await this.service.getProducts(options, isStaff);
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

    getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const isStaff = this.isStaff(req);
            const product = await this.service.getProductById(id as string, isStaff);
            res.status(200).json({
                success: true,
                data: product,
            });
        } catch (error) {
            next(error);
        }
    };

    getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { slug } = req.params;
            const isStaff = this.isStaff(req);
            const product = await this.service.getProductBySlug(slug as string, isStaff);
            res.status(200).json({
                success: true,
                data: product,
            });
        } catch (error) {
            next(error);
        }
    };

    updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const input: UpdateProductInput = req.body;
            const product = await this.service.updateProduct(id as string, input, req.user?.id);
            res.status(200).json({
                success: true,
                message: "Product updated successfully",
                data: product,
            });
        } catch (error) {
            next(error);
        }
    };

    publishProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const product = await this.service.publishProduct(id as string, req.user?.id);
            res.status(200).json({
                success: true,
                message: "Product published successfully",
                data: product,
            });
        } catch (error) {
            next(error);
        }
    };

    deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            await this.service.deleteProduct(id as string, req.user?.id);
            res.status(200).json({
                success: true,
                message: "Product archived successfully",
            });
        } catch (error) {
            next(error);
        }
    };
}

export const productController = new ProductController();
