import { Request, Response, NextFunction } from "express";
import { inventoryService, InventoryService } from "../services/inventory.service.js";

export class PublicInventoryController {
    constructor(private readonly service: InventoryService = inventoryService) {}

    getVariantAvailability = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const productId = req.params.productId as string;
            const variantId = req.params.variantId as string;
            const data = await this.service.getPublicVariantAvailability(productId, variantId);
            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const publicInventoryController = new PublicInventoryController();
