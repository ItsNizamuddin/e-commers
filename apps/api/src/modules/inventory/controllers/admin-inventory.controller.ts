import { Request, Response, NextFunction } from "express";
import { resolveActor } from "../../../utils/audit.js";
import { inventoryService, InventoryService } from "../services/inventory.service.js";

export class AdminInventoryController {
    constructor(private readonly service: InventoryService = inventoryService) {}

    listInventory = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const result = await this.service.listInventory(req.query as any);
            res.status(200).json({
                success: true,
                data: result.items,
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

    getInventoryById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const id = req.params.id as string;
            const inventory = await this.service.getInventoryById(id);
            res.status(200).json({
                success: true,
                data: inventory,
            });
        } catch (error) {
            next(error);
        }
    };

    adjustInventory = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const actor = await resolveActor(req.user?.id);
            const result = await this.service.adjustStock(req.body, actor);
            res.status(200).json({
                success: true,
                message: "Inventory stock adjusted successfully",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    updateThresholds = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const actor = await resolveActor(req.user?.id);
            const id = req.params.id as string;
            const data = await this.service.updateThresholds(
                id,
                req.body,
                actor
            );
            res.status(200).json({
                success: true,
                message: "Inventory thresholds updated successfully",
                data,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const adminInventoryController = new AdminInventoryController();
