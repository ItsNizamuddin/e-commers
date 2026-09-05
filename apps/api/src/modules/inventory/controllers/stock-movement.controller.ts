import { Request, Response, NextFunction } from "express";
import { resolveActor } from "../../../utils/audit.js";
import { stockMovementService, StockMovementService } from "../services/stock-movement.service.js";

export class StockMovementController {
    constructor(private readonly service: StockMovementService = stockMovementService) {}

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

    listMovements = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const result = await this.service.listMovements(
                req.query as any,
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                }
            );
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

    getMovementById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const id = req.params.id as string;
            const movement = await this.service.getMovementById(id);
            res.status(200).json({
                success: true,
                data: movement,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const stockMovementController = new StockMovementController();
