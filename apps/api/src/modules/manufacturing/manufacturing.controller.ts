import { Request, Response } from "express";
import { manufacturingService } from "./manufacturing.service.js";
import { resolveActor } from "../../utils/audit.js";

export class ManufacturingController {
    // Raw Materials
    async listRawMaterials(req: Request, res: Response) {
        const { search, category, usage, isActive } = req.query as {
            search?: string;
            category?: string;
            usage?: string;
            isActive?: string;
        };

        const materials = await manufacturingService.listRawMaterials({
            search,
            category,
            usage,
            isActive: isActive !== undefined ? isActive === "true" : undefined,
        });

        res.json({ success: true, data: materials });
    }

    async getRawMaterialById(req: Request, res: Response) {
        const { id } = req.params;
        const material = await manufacturingService.getRawMaterialById(id as string);
        res.json({ success: true, data: material });
    }

    async createRawMaterial(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const material = await manufacturingService.createRawMaterial(req.body, actor);
        res.status(201).json({ success: true, data: material });
    }

    async updateRawMaterial(req: Request, res: Response) {
        const { id } = req.params;
        const material = await manufacturingService.updateRawMaterial(id as string, req.body);
        res.json({ success: true, data: material });
    }

    // Purchases & Intakes
    async recordPurchaseIntake(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const result = await manufacturingService.recordPurchaseIntake(req.body, actor);
        res.status(201).json({ success: true, data: result });
    }

    async listLots(req: Request, res: Response) {
        const { rawMaterialId, isDepleted } = req.query as {
            rawMaterialId?: string;
            isDepleted?: string;
        };

        const lots = await manufacturingService.listLots({
            rawMaterialId,
            isDepleted: isDepleted !== undefined ? isDepleted === "true" : undefined,
        });

        res.json({ success: true, data: lots });
    }

    async listLedger(req: Request, res: Response) {
        const { rawMaterialId, limit } = req.query as {
            rawMaterialId?: string;
            limit?: string;
        };

        const movements = await manufacturingService.listLedger({
            rawMaterialId,
            limit: limit ? parseInt(limit, 10) : 100,
        });

        res.json({ success: true, data: movements });
    }

    // Recipes
    async listRecipes(req: Request, res: Response) {
        const { productId, status } = req.query as {
            productId?: string;
            status?: string;
        };

        const recipes = await manufacturingService.listRecipes({ productId, status });
        res.json({ success: true, data: recipes });
    }

    async getRecipeById(req: Request, res: Response) {
        const { id } = req.params;
        const recipe = await manufacturingService.getRecipeById(id as string);
        res.json({ success: true, data: recipe });
    }

    async createRecipe(req: Request, res: Response) {
        const recipe = await manufacturingService.createRecipe(req.body);
        res.status(201).json({ success: true, data: recipe });
    }

    async updateRecipe(req: Request, res: Response) {
        const { id } = req.params;
        const recipe = await manufacturingService.updateRecipe(id as string, req.body);
        res.json({ success: true, data: recipe });
    }

    // Production Runs & Feasibility
    async checkFeasibility(req: Request, res: Response) {
        const { recipeId, quantity, manufacturingDate } = req.query as {
            recipeId?: string;
            quantity?: string;
            manufacturingDate?: string;
        };

        if (!recipeId) {
            return res.status(400).json({ success: false, message: "recipeId query parameter is required" });
        }

        const qty = quantity ? parseFloat(quantity) : 1;
        const result = await manufacturingService.checkProductionFeasibility(
            recipeId,
            qty,
            manufacturingDate
        );

        res.json({ success: true, data: result });
    }

    async executeProductionRun(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.executeProductionRun(req.body, actor);
        res.status(201).json({ success: true, data: run });
    }

    async reverseProductionRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.reverseProductionRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }

    async listProductionRuns(req: Request, res: Response) {
        const { productId, recipeId, status, limit } = req.query as {
            productId?: string;
            recipeId?: string;
            status?: string;
            limit?: string;
        };

        const runs = await manufacturingService.listProductionRuns({
            productId,
            recipeId,
            status,
            limit: limit ? parseInt(limit, 10) : 50,
        });

        res.json({ success: true, data: runs });
    }

    async syncVariantCost(req: Request, res: Response) {
        const result = await manufacturingService.syncVariantCost(req.body);
        res.json({ success: true, data: result });
    }

    // Repackaging Runs (Bulk to Retail)
    async listRepackagingRuns(req: Request, res: Response) {
        const { sourceRawMaterialId, targetProductId, status } = req.query as {
            sourceRawMaterialId?: string;
            targetProductId?: string;
            status?: string;
        };

        const runs = await manufacturingService.listRepackagingRuns({
            sourceRawMaterialId,
            targetProductId,
            status,
        });

        res.json({ success: true, data: runs });
    }

    async createRepackagingRun(req: Request, res: Response) {
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.createRepackagingRun(req.body, actor);
        res.status(201).json({ success: true, data: run });
    }

    async reverseRepackagingRun(req: Request, res: Response) {
        const { id } = req.params;
        const actor = await resolveActor((req as any).user?.id);
        const run = await manufacturingService.reverseRepackagingRun(id as string, req.body, actor);
        res.json({ success: true, data: run });
    }
}

export const manufacturingController = new ManufacturingController();

